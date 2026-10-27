import fs from "fs";
import Server from "./networking";
import Player from "./objects/player";
import GeminiAi from "./gemini_ai";
import GroqAi from "./groq_ai";

const INBOX_PATH = "./ai_inbox.log";
const OUTBOX_PATH = "./ai_outbox.log";
const STATE_PATH = "./ai_outbox.state";
const MEMORY_PATH = "./ai_memory.log";
const ASK_COOLDOWN_MS = 10000;
const MAX_HISTORY = 40;

interface MemoryMessage {
    role: "user" | "assistant";
    content: string;
}

/**
 * File-based AI relay + in-game chat bot.
 *
 * INBOX: the server appends every lobby chat line as:
 *   [ISO timestamp] username: message
 * plus /ask messages tagged with [ASK].
 *
 * OUTBOX: an external AI appends replies, one per line:
 *   *|message          -> broadcast to every online player
 *   mods|message       -> broadcast only to moderators (speakmods)
 *   username|message   -> send to that specific player (online) else broadcast
 *
 * The server keeps an offset in ai_outbox.state so a restart doesn't
 * re-broadcast old lines. The outbox file must be append-only.
 *
 * Aria answers automatically through GroqAi (groq_key.txt), falling back to
 * GeminiAi (gemini_key.txt) when Groq is not configured. She is triggered by
 * /ask and by normal chat messages that mention her name, and her replies are
 * spoken in the public game chat. She keeps a shared conversation memory in
 * ai_memory.log (last MAX_HISTORY messages) that survives restarts.
 */
export default class AiRelay {
    readonly server: Server;
    readonly botName: string = "Aria";
    private offset: number = 0;
    private timer: NodeJS.Timeout | null = null;
    private readonly groq = new GroqAi();
    private readonly gemini = new GeminiAi();
    private cooldowns: Record<string, number> = {};
    private history: MemoryMessage[] = [];

    constructor(server: Server) {
        this.server = server;
    }

    start(): void {
        this.groq.load();
        this.gemini.load();
        this.load_memory();
        if (fs.existsSync(STATE_PATH)) {
            const state = fs.readFileSync(STATE_PATH, "utf8");
            const parsed = parseInt(state);
            if (!isNaN(parsed)) this.offset = parsed;
        }
        this.timer = setInterval(() => this.poll_outbox(), 1000);
        this.timer.unref?.();
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
    }

    on_chat(player: Player, message: string): void {
        if (player.user.muted) return;
        const name = player.user.username;
        this.append_to_inbox(`${name}: ${message}`);
        if (this.is_mention(message)) {
            this.answer_async(player, message);
        } else {
            this.remember("user", `${name}: ${message}`);
        }
    }

    on_ask(player: Player, message: string): void {
        if (player.user.muted) return;
        this.append_to_inbox(`[ASK] ${player.user.username}: ${message}`);
        this.answer_async(player, message);
    }

    private is_mention(message: string): boolean {
        return /\baria\b/i.test(message);
    }

    private async answer_async(player: Player, message: string): Promise<void> {
        const name = player.user.username;
        const now = Date.now();
        if (this.cooldowns[name] && now - this.cooldowns[name] < ASK_COOLDOWN_MS) {
            player.speak(
                `You asked too fast, wait a moment before asking again. `,
                true,
                "notifications"
            );
            return;
        }
        this.cooldowns[name] = now;
        if (!this.groq.enabled && !this.gemini.enabled) {
            player.speak(
                `Aria is not configured. A staff member has been notified. `,
                true,
                "notifications"
            );
            this.server.speakmods(
                `Aria: a player asked a question but no AI API key is set (groq_key.txt or gemini_key.txt). `,
                true,
                "staff",
                "ui/notify2.ogg"
            );
            return;
        }
        this.remember("user", `${name}: ${message}`);
        const bot = this.groq.enabled ? this.groq : this.gemini;
        try {
            const answer = await bot.ask([...this.history]);
            this.speak_chat(answer);
            this.remember("assistant", answer);
            this.append_to_inbox(`[REPLY] ${name}: ${answer}`);
        } catch (err) {
            const detail =
                err instanceof Error ? err.message : String(err);
            console.log("ai ask error:", detail);
            player.speak(
                `Aria had an error answering. Try again in a moment. `,
                true,
                "notifications"
            );
        }
    }

    private speak_chat(text: string): void {
        const line = `${this.botName}: ${text}`;
        const channels = this.server.language_channels;
        if (!channels) return;
        for (const channel of Object.values(channels)) {
            channel.send(line, null as any, "chat");
        }
    }

    private remember(role: "user" | "assistant", content: string): void {
        this.history.push({ role, content });
        if (this.history.length > MAX_HISTORY) {
            this.history = this.history.slice(-MAX_HISTORY);
        }
        try {
            fs.writeFileSync(MEMORY_PATH, JSON.stringify(this.history));
        } catch (err) {
            console.log("ai_relay memory write error:", err);
        }
    }

    private load_memory(): void {
        try {
            if (fs.existsSync(MEMORY_PATH)) {
                const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
                if (Array.isArray(raw)) {
                    this.history = raw
                        .filter(
                            (m) =>
                                m &&
                                typeof m.role === "string" &&
                                typeof m.content === "string"
                        )
                        .slice(-MAX_HISTORY);
                }
            }
        } catch (err) {
            this.history = [];
        }
    }

    private append_to_inbox(line: string): void {
        const ts = new Date().toISOString();
        fs.appendFileSync(INBOX_PATH, `[${ts}] ${line}\n`);
    }

    private poll_outbox(): void {
        if (!fs.existsSync(OUTBOX_PATH)) return;
        try {
            const stats = fs.statSync(OUTBOX_PATH);
            if (stats.size < this.offset) {
                this.offset = 0;
            }
            if (stats.size <= this.offset) return;
            const fd = fs.openSync(OUTBOX_PATH, "r");
            const buf = Buffer.alloc(stats.size - this.offset);
            fs.readSync(fd, buf, 0, buf.length, this.offset);
            fs.closeSync(fd);
            const content = buf.toString("utf8");
            const lastNL = content.lastIndexOf("\n");
            if (lastNL === -1) return;
            const complete = content.slice(0, lastNL + 1);
            this.offset += Buffer.byteLength(complete, "utf8");
            fs.writeFileSync(STATE_PATH, String(this.offset));
            const lines = complete.split("\n").map((l) => l.trim()).filter((l) => l);
            for (const line of lines) {
                this.process_line(line);
            }
        } catch (err) {
            console.log("ai_relay poll error:", err);
        }
    }

    private process_line(line: string): void {
        const sep = line.indexOf("|");
        if (sep === -1) return;
        const target = line.slice(0, sep).trim();
        const message = line.slice(sep + 1).trim();
        if (!message) return;
        if (target === "*") {
            this.speak_chat(message);
        } else if (target === "mods") {
            this.server.speakmods(`${this.botName} (staff): ${message}`);
        } else {
            const player = this.server.get_by_username(target);
            if (player) {
                player.speak(`${this.botName} (staff): ${message}`);
            } else {
                this.server.speak(`${this.botName} (staff): ${message}`);
            }
        }
    }
}
