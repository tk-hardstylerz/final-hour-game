"use strict";
// End-to-end test of /ask -> Gemini -> reply against a local HTTP stub.
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

(async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "relay2-"));

    // local stub server that mimics the Gemini generateContent API
    let receivedBody = null;
    let receivedQuery = null;
    const stub = http.createServer((req, res) => {
        receivedQuery = req.url.split("?")[1] || "";
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            receivedBody = JSON.parse(body);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    candidates: [
                        { content: { parts: [{ text: "Respuesta de prueba" }] } },
                    ],
                })
            );
        });
    });
    await new Promise((r) => stub.listen(0, "127.0.0.1", r));
    const port = stub.address().port;
    // Set BEFORE requiring the module (API_URL is computed at import time)
    process.env.GEMINI_API_URL = `http://127.0.0.1:${port}/v1beta/models/`;
    process.env.GEMINI_MODEL = "test-model";

    const D = (p) => require(path.join(__dirname, "dist", "libs", p));
    D("event_handeler.js");
    const AiRelay = D("ai_relay.js").default;

    process.chdir(tmp);
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
    relay.on_ask(player, "que es juggernog?");
    await new Promise((r) => setTimeout(r, 800));

    assert(!!receivedBody, "ask reaches the AI API");
    assert(receivedQuery.includes("key="), "request URL includes the API key");
    assert(!!receivedBody.systemInstruction, "request carries systemInstruction");
    assert(
        receivedBody.systemInstruction.parts[0].text.includes("contexto FH"),
        "systemInstruction contains the FH context file content"
    );
    assert(
        receivedBody.contents[0].parts[0].text.includes("the_killer"),
        "question includes the asking player's name"
    );
    assert(
        server.spoken.some((s) => s.includes("Respuesta de prueba")),
        "AI reply appears in the chat buffer like a normal player"
    );
    assert(
        fs.readFileSync("ai_inbox.log", "utf8").includes("[REPLY]"),
        "reply is logged to the inbox"
    );

    // cooldown: immediate second ask is refused (no AI reply generated)
    const aiRepliesBefore = server.spoken.filter((s) => s.includes("Respuesta de prueba")).length;
    relay.on_ask(player, "otra pregunta");
    await new Promise((r) => setTimeout(r, 500));
    const aiRepliesAfter = server.spoken.filter((s) => s.includes("Respuesta de prueba")).length;
    assert(aiRepliesAfter === aiRepliesBefore, "cooldown prevents instant re-ask (no new AI reply)");

    relay.stop();
    stub.close();
    process.chdir(os.tmpdir());
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
