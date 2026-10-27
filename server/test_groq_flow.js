"use strict";
// End-to-end test of /ask -> Groq -> public reply, mention-by-name trigger,
// shared chat memory and restart persistence, against a local HTTP stub that
// mimics the Groq /openai/v1/chat/completions API.
process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");

let pass = 0;
let fail = 0;
function assert(cond, name) {
    if (cond) { pass++; console.log("PASS:", name); }
    else { fail++; console.log("FAIL:", name); }
}

const replies = (arr) => arr.filter((s) => s.includes("Respuesta de prueba groq"));

(async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "groqflow-"));

    // local stub server that mimics the Groq chat completions API
    let receivedBody = null;
    let receivedAuth = null;
    const stub = http.createServer((req, res) => {
        receivedAuth = req.headers["authorization"] || null;
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            receivedBody = JSON.parse(body);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    choices: [
                        { message: { role: "assistant", content: "Respuesta de prueba groq" } },
                    ],
                })
            );
        });
    });
    await new Promise((r) => stub.listen(0, "127.0.0.1", r));
    const port = stub.address().port;
    // Set BEFORE requiring the module (API_URL is computed at import time)
    process.env.GROQ_API_URL = `http://127.0.0.1:${port}/openai/v1/chat/completions`;
    process.env.GROQ_MODEL = "test-groq-model";

    const D = (p) => require(path.join(__dirname, "dist", "libs", p));
    D("event_handeler.js");
    const AiRelay = D("ai_relay.js").default;

    process.chdir(tmp);
    // both keys present -> Groq must win
    fs.writeFileSync("groq_key.txt", "gsk-FakeKey123");
    fs.writeFileSync("gemini_key.txt", "AIzaSyFakeKey123");
    fs.writeFileSync("ai_fh_context.txt", "contexto FH");
    fs.writeFileSync("ai_inbox.log", "");

    const player = {
        user: { username: "the_killer", muted: false },
        spoke: [],
        speak(t) { this.spoke.push(t); },
    };
    const server = {
        spoken: [],
        language_channels: {
            english: { send: (msg) => { server.spoken.push(msg); } },
        },
        speak(t) { this.spoken.push(t); },
        speakmods(t) {},
        get_by_username(n) { return n === "the_killer" ? player : undefined; },
    };

    const relay = new AiRelay(server);
    relay.start();

    // 1) /ask -> reply is broadcast publicly
    relay.on_ask(player, "que es juggernog?");
    await new Promise((r) => setTimeout(r, 800));
    assert(!!receivedBody, "ask reaches the AI API");
    assert(receivedAuth === "Bearer gsk-FakeKey123", "request uses Bearer auth with the groq key");
    assert(receivedBody.model === "test-groq-model", "request carries the configured model");
    assert(Array.isArray(receivedBody.messages), "request carries an OpenAI-style messages array");
    assert(
        receivedBody.messages.some((m) => m.role === "system" && m.content.includes("contexto FH")),
        "system message contains the FH context file content"
    );
    assert(receivedBody.messages.length === 2, "first request has system + 1 user message");
    assert(
        receivedBody.messages.some((m) => m.role === "user" && m.content.includes("the_killer")),
        "user message includes the asking player's name"
    );
    assert(receivedBody.stream === false, "request is non-streaming");
    assert(
        server.spoken.some((s) => s.includes("Respuesta de prueba groq")),
        "AI reply is broadcast to the whole chat"
    );
    assert(
        server.spoken.some((s) => s.includes("Aria: Respuesta de prueba groq")),
        "reply appears in the chat buffer as Aria (like a normal player)"
    );
    assert(
        fs.readFileSync("ai_inbox.log", "utf8").includes("[REPLY]"),
        "reply is logged to the inbox"
    );

    // 2) mention by name in normal chat triggers a reply + history is sent
    relay.cooldowns["the_killer"] = 0;
    relay.on_chat(player, "aria, que es speed cola?");
    await new Promise((r) => setTimeout(r, 800));
    assert(
        receivedBody.messages.length === 4,
        "second request carries the full history (system + 2 user + 1 assistant)"
    );
    assert(
        receivedBody.messages.some((m) => m.role === "assistant" && m.content.includes("Respuesta de prueba groq")),
        "history includes the previous assistant reply"
    );
    assert(
        receivedBody.messages.some((m) => m.role === "user" && m.content.includes("speed cola")),
        "mention message reaches the AI"
    );
    assert(replies(server.spoken).length === 2, "mention produced a second public reply");

    // 3) non-mention chat line is remembered but does NOT trigger a reply
    const spokenBefore = replies(server.spoken).length;
    relay.on_chat(player, "alguien me revive");
    await new Promise((r) => setTimeout(r, 500));
    assert(replies(server.spoken).length === spokenBefore, "non-mention chat does NOT trigger a reply");

    // 4) memory file persists the shared conversation
    const memory = JSON.parse(fs.readFileSync("ai_memory.log", "utf8"));
    assert(Array.isArray(memory) && memory.length === 5, "memory file stores the conversation (5 messages)");
    assert(
        memory.some((m) => m.role === "user" && m.content.includes("alguien me revive")),
        "memory includes non-triggering chat lines"
    );

    // 5) cooldown: immediate ask after a real one is refused (no new AI reply)
    const before = replies(server.spoken).length;
    relay.on_ask(player, "otra pregunta");
    await new Promise((r) => setTimeout(r, 500));
    assert(replies(server.spoken).length === before, "cooldown prevents instant re-ask (no new AI reply)");

    // 6) restart: a fresh relay loads the memory from disk
    relay.stop();
    const relay2 = new AiRelay(server);
    relay2.start();
    relay2.cooldowns["the_killer"] = 0;
    relay2.on_ask(player, "que es whos who?");
    await new Promise((r) => setTimeout(r, 800));
    assert(
        receivedBody.messages.length === 7,
        "after restart the history survives (system + 5 remembered + 1 new user)"
    );
    assert(
        receivedBody.messages.some((m) => m.role === "user" && m.content.includes("alguien me revive")),
        "restored memory includes pre-restart chat lines"
    );
    relay2.stop();

    stub.close();
    process.chdir(os.tmpdir());
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
