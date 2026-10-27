"use strict";
// Live test: GroqAi (new messages API) against the real Groq API, using the
// real groq_key.txt + ai_fh_context.txt. Runs in a temp dir so no game files
// are touched. Does a 2-turn conversation to prove memory works.
process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const os = require("os");

const D = (p) => require(path.join(__dirname, "dist", "libs", p));
D("event_handeler.js");
const GroqAi = D("groq_ai.js").default;

(async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "groqlive-"));
    fs.copyFileSync("groq_key.txt", path.join(tmp, "groq_key.txt"));
    fs.copyFileSync("ai_fh_context.txt", path.join(tmp, "ai_fh_context.txt"));
    process.chdir(tmp);

    const ai = new GroqAi();
    ai.load();
    if (!ai.enabled) {
        console.log("No key configured in groq_key.txt");
        process.exit(1);
    }

    const turn1 = await ai.ask([{ role: "user", content: "the_killer: que es whos who?" }]);
    console.log("T1 ->", turn1);

    const turn2 = await ai.ask([
        { role: "user", content: "the_killer: que es whos who?" },
        { role: "assistant", content: turn1 },
        { role: "user", content: "the_killer: y que perk me conviene para jugar solo?" },
    ]);
    console.log("T2 ->", turn2);

    const bad = (turn1 + turn2).toLowerCase().includes("opencode");
    const askEcho = (turn1 + turn2).toLowerCase().includes("/ask");
    console.log("says opencode:", bad, "| echoes /ask:", askEcho);
    if (bad || askEcho) process.exit(1);

    process.chdir(os.tmpdir());
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    console.log("OK: live Groq (memory) call succeeded");
})().catch((e) => { console.error("LIVE ERROR:", e.response?.data || e.message); process.exit(1); });
