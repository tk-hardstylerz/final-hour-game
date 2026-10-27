import fs from "fs";
import axios from "axios";

const KEY_PATH = "./gemini_key.txt";
const CONTEXT_PATH = "./ai_fh_context.txt";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_URL =
    (process.env.GEMINI_API_URL ||
        "https://generativelanguage.googleapis.com/v1beta/models/") +
    MODEL +
    ":generateContent";

/**
 * Wraps the Google Gemini REST API so the game can answer /ask questions
 * from any player using a single shared API key (gemini_key.txt).
 * Context about Final Hour is read from ai_fh_context.txt (editable).
 */
export default class GeminiAi {
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
                "Gemini is not configured. Add your API key to gemini_key.txt"
            );
        }
        const systemInstruction = this.context
            ? { parts: [{ text: this.context }] }
            : undefined;
        const contents = messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));
        const response = await axios.post(
            API_URL + "?key=" + encodeURIComponent(this.key),
            { contents, systemInstruction },
            { timeout: 30000 }
        );
        const candidate = response.data?.candidates?.[0];
        const text = candidate?.content?.parts
            ?.map((p: any) => p.text ?? "")
            .join("");
        if (!text) {
            throw new Error("Gemini returned no text");
        }
        return text.trim();
    }
}
