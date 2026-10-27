// Aria bot voice: synthesize short voice lines with Edge TTS (free neural
// voices), transcode to 48 kHz mono PCM via ffmpeg, Opus-encode into 20 ms
// frames (960 samples), and let the game stream them through the bot's voice
// channel so players hear Aria exactly like another player's voice chat.
// Falls back to the Windows SAPI voice when edge-tts/ffmpeg are unavailable.
import { execFile } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const execFileP = promisify(execFile);
const OpusScript: any = require("opusscript");

export const ARIA_VOICE = "es-MX-DaliaNeural";

export type QuipCategory = "random" | "low_hp" | "death" | "revive" | "kill";

export const ARIA_QUIPS: Record<QuipCategory, string[]> = {
    random: [
        "El aire aquí huele a cartón viejo...",
        "Quédate cerca, vamos a lograrlo.",
        "Respira, dispara y vuelve a respirar.",
        "Tengo un buen presentimiento con esta ronda.",
        "¡Cuida tus espaldas!",
        "Esto está extrañamente tranquilo... demasiado tranquilo.",
        "Mantén los ojos en las ventanas.",
        "No te arriesgues demasiado ahí fuera.",
    ],
    low_hp: [
        "¡Necesito ayuda, estoy herida!",
        "¡Me están castigando aquí!",
        "¡Mi vida está cayendo muy rápido!",
        "¿Alguien me cubre la espalda?",
        "¡No voy a durar mucho más!",
    ],
    death: [
        "¡Estoy caída! ¡Alguien que me reviva!",
        "Me atraparon... ¡necesito una mano!",
        "¡Caigo! ¡Por aquí!",
    ],
    revive: [
        "¡Volví! ¡Gracias!",
        "Lista para volver a la acción.",
        "Eso estuvo duro. ¡Sigamos!",
    ],
    kill: ["¡Y va uno!", "Uno menos.", "¡Ese ya cayó!"],
};

const SAMPLE_RATE = 48000;
const FRAME_SAMPLES = 960; // 20 ms
const FRAME_BYTES = FRAME_SAMPLES * 2; // 16-bit mono

function cache_dir(): string {
    return path.join(process.cwd(), "aria_voice_cache");
}
function tmp_dir(): string {
    return path.join(cache_dir(), "tmp");
}
function cache_file(hash: string): string {
    return path.join(cache_dir(), `${hash}.voice`);
}

function ensure_dirs(): void {
    fs.mkdirSync(cache_dir(), { recursive: true });
    fs.mkdirSync(tmp_dir(), { recursive: true });
}

function read_packed_frames(filename: string): Buffer[] | null {
    let raw: Buffer;
    try {
        raw = fs.readFileSync(filename);
    } catch {
        return null;
    }
    if (raw.length < 4) return null;
    const count = raw.readUInt32LE(0);
    let offset = 4;
    const frames: Buffer[] = [];
    try {
        for (let i = 0; i < count; i++) {
            const len = raw.readUInt32LE(offset);
            offset += 4;
            frames.push(raw.subarray(offset, offset + len));
            offset += len;
        }
    } catch {
        return null;
    }
    return frames;
}

function write_packed_frames(filename: string, frames: Buffer[]): void {
    const header = Buffer.alloc(4);
    header.writeUInt32LE(frames.length, 0);
    const parts: Buffer[] = [header];
    for (const frame of frames) {
        const len = Buffer.alloc(4);
        len.writeUInt32LE(frame.length, 0);
        parts.push(len, frame);
    }
    fs.writeFileSync(filename, Buffer.concat(parts));
}

function frames_from_pcm(pcm: Buffer): Buffer[] {
    const encoder = new OpusScript(SAMPLE_RATE, 1, OpusScript.Application.VOIP);
    const frames: Buffer[] = [];
    for (let offset = 0; offset + FRAME_BYTES <= pcm.length; offset += FRAME_BYTES) {
        frames.push(encoder.encode(pcm.subarray(offset, offset + FRAME_BYTES), FRAME_SAMPLES));
    }
    encoder.delete();
    return frames;
}

async function run(cmd: string, args: string[]): Promise<void> {
    await execFileP(cmd, args, { windowsHide: true, timeout: 30000 });
}

async function synth_edge(hash: string, text: string, voice: string): Promise<Buffer[] | null> {
    const mp3 = path.join(tmp_dir(), `${hash}-${process.pid}.mp3`);
    const pcm = path.join(tmp_dir(), `${hash}-${process.pid}.pcm`);
    try {
        await run("python", [
            "-m",
            "edge_tts",
            "--voice",
            voice,
            "--text",
            text,
            "--write-media",
            mp3,
        ]);
        await run("ffmpeg", [
            "-y",
            "-loglevel",
            "error",
            "-i",
            mp3,
            "-f",
            "s16le",
            "-ac",
            "1",
            "-ar",
            String(SAMPLE_RATE),
            pcm,
        ]);
        const raw = fs.readFileSync(pcm);
        if (raw.length < FRAME_BYTES) return null;
        return frames_from_pcm(raw);
    } catch {
        return null;
    } finally {
        for (const f of [mp3, pcm]) {
            try {
                fs.unlinkSync(f);
            } catch {}
        }
    }
}

// Windows SAPI fallback: writes a 48 kHz mono 16-bit WAV via PowerShell.
async function synth_sapi(hash: string, text: string): Promise<Buffer[] | null> {
    const wav = path.join(tmp_dir(), `${hash}-${process.pid}.wav`);
    const ps1 = path.join(tmp_dir(), `${hash}-${process.pid}.ps1`);
    const psText = "'" + text.replace(/'/g, "''") + "'";
    const script = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        "$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono);",
        `$s.SetOutputToWaveFile("${wav.replace(/"/g, '""')}", $fmt);`,
        `$s.Speak(${psText});`,
        "$s.Dispose();",
    ].join("\n");
    try {
        fs.writeFileSync(ps1, script);
        await run("powershell", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            ps1,
        ]);
        const wavData = fs.readFileSync(wav);
        const frames = frames_from_wav(wavData);
        return frames && frames.length > 0 ? frames : null;
    } catch {
        return null;
    } finally {
        for (const f of [wav, ps1]) {
            try {
                fs.unlinkSync(f);
            } catch {}
        }
    }
}

function frames_from_wav(wav: Buffer): Buffer[] | null {
    if (wav.length < 12) return null;
    let offset = 12;
    let sample_rate = 0;
    let channels = 0;
    let bits = 0;
    let data: Buffer | null = null;
    while (offset + 8 <= wav.length) {
        const id = wav.toString("ascii", offset, offset + 4);
        const size = wav.readUInt32LE(offset + 4);
        offset += 8;
        if (id === "fmt ") {
            bits = wav.readUInt16LE(offset + 14);
            channels = wav.readUInt16LE(offset + 2);
            sample_rate = wav.readUInt32LE(offset + 4);
        } else if (id === "data") {
            data = wav.subarray(offset, offset + size);
        }
        offset += size;
    }
    if (!data) return null;
    if (sample_rate !== SAMPLE_RATE || channels !== 1 || bits !== 16) return null;
    const encoder = new OpusScript(SAMPLE_RATE, 1, OpusScript.Application.VOIP);
    const frames: Buffer[] = [];
    for (let i = 0; i + FRAME_BYTES <= data.length; i += FRAME_BYTES) {
        frames.push(encoder.encode(data.subarray(i, i + FRAME_BYTES), FRAME_SAMPLES));
    }
    encoder.delete();
    return frames;
}

const pending: Record<string, Promise<Buffer[] | null>> = {};

// Opus frames for `text`, cached on disk keyed by (voice, text).
export async function synthesize_frames(
    text: string,
    voice: string = ARIA_VOICE
): Promise<Buffer[] | null> {
    const hash = crypto
        .createHash("sha1")
        .update(`${voice}|${text}`)
        .digest("hex");
    if (hash in pending) return pending[hash];
    pending[hash] = (async () => {
        ensure_dirs();
        const cached = read_packed_frames(cache_file(hash));
        if (cached) return cached;
        let frames = await synth_edge(hash, text, voice);
        if (!frames) frames = await synth_sapi(hash, text);
        if (!frames || frames.length === 0) return null;
        try {
            write_packed_frames(cache_file(hash), frames);
        } catch {}
        return frames;
    })();
    try {
        return await pending[hash];
    } finally {
        delete pending[hash];
    }
}

// Stream pre-encoded opus frames through the bot's voice channel. The client
// decodes each 20 ms frame and queues it into its OpenAL source right away, so
// sending every frame back-to-back lets the source play the whole phrase at its
// natural 48 kHz rate with no buffer underruns. (Pacing each frame with a
// setTimeout is what made the audio choppy on Windows.)
export async function stream_opus_frames(bot: any, frames: Buffer[] | null): Promise<void> {
    if (!bot || !frames || frames.length === 0) return;
    const map = bot.map;
    const channel = bot.voice_channel;
    if (!map || channel === undefined) return;
    for (let i = 0; i < frames.length; i++) {
        if (!bot.map || bot.map !== map) return;
        try {
            map.send(channel, "n/a", frames[i], []);
        } catch {
            return;
        }
    }
}