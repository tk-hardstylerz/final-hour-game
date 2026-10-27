import fs from "fs";
import axios from "axios";

const KEY_PATH = "./groq_key.txt";
const CONTEXT_PATH = "./ai_fh_context.txt";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const API_URL =
    process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

/**
 * Wraps the Groq REST API (OpenAI-compatible chat completions) so the game
 * can answer /ask questions and chat from any player using a single shared
 * API key (groq_key.txt, format gsk-...). Context about Final Hour is read
 * from ai_fh_context.txt (editable). `ask` receives the full message history
 * (roles user/assistant) built by the relay.
 */
export default class GroqAi {
    private key: string = "";
    private context: string = "";

    load(): void {
        try {
            this.key = fs
                .readFileSync(KEY_PATH, "utf8")
                .trim()
                .split("\n")[0]
                .trim();
        } catch (err) {
            this.key = "";
        }
        try {
            this.context = fs.readFileSync(CONTEXT_PATH, "utf8").trim();
        } catch (err) {
            this.context = "";
        }
    }

    get enabled(): boolean {
        return this.key.length > 0 && !this.key.startsWith("Paste your");
    }

    async ask(messages: Array<{ role: string; content: string }>): Promise<string> {
        if (!this.enabled) {
            throw new Error(
                "Groq is not configured. Add your API key to groq_key.txt"
            );
        }
        const full: Array<{ role: string; content: string }> = [];
        if (this.context) {
            full.push({ role: "system", content: this.context });
        }
        for (const m of messages) {
            full.push({ role: m.role, content: m.content });
        }
        const response = await axios.post(
            API_URL,
            { model: MODEL, messages: full, stream: false },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + this.key,
                },
                timeout: 30000,
            }
        );
        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("Groq returned no text");
        }
        return content.trim();
    }

    /**
     * One-shot completion for non-chat tasks (e.g. Aria's tactical brain).
     * Uses a dedicated system message instead of the chat context file and
     * caps the response length so it stays cheap and fast.
     */
    async complete(
        system: string,
        user: string,
        max_tokens = 96
    ): Promise<string> {
        if (!this.enabled) {
            throw new Error(
                "Groq is not configured. Add your API key to groq_key.txt"
            );
        }
        const response = await axios.post(
            API_URL,
            {
                model: MODEL,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
                stream: false,
                max_tokens: max_tokens,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + this.key,
                },
                timeout: 30000,
            }
        );
        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("Groq returned no text");
        }
        return content.trim();
    }
}
