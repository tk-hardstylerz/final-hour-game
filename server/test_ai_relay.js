"use strict";
// Integration test for the file-based AI relay using the REAL compiled modules.
process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const os = require("os");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "airelay-"));
process.chdir(tmp);

const D = (p) => require(path.join(__dirname, "dist", "libs", p));
D("event_handeler.js");
const AiRelay = D("ai_relay.js").default;

let pass = 0;
let fail = 0;
function assert(cond, name) {
    if (cond) { pass++; console.log("PASS:", name); }
    else { fail++; console.log("FAIL:", name); }
}

const server = {
    spoken: [],
    modspoken: [],
    language_channels: {
        english: { send: (msg) => { server.spoken.push(msg); } },
    },
    speak(text) { this.spoken.push(text); },
    speakmods(text) { this.modspoken.push(text); },
    get_by_username(name) { return this.online[name]; },
    online: {},
};
const player = {
    user: { username: "tester", muted: false },
    speak(t) {},
};

(async () => {
    const relay = new AiRelay(server);
    relay.start();

    // 1) chat -> inbox
    relay.on_chat(player, "hello world");
    let inbox = fs.readFileSync("./ai_inbox.log", "utf8");
    assert(inbox.includes("tester: hello world"), "chat writes username + message to inbox");

    // 2) muted player not logged
    const muted = { user: { username: "muted", muted: true } };
    relay.on_chat(muted, "hidden");
    inbox = fs.readFileSync("./ai_inbox.log", "utf8");
    assert(!inbox.includes("hidden"), "muted player chat is NOT written to inbox");

    // 3) /ask tagged
    relay.on_ask(player, "whats up");
    inbox = fs.readFileSync("./ai_inbox.log", "utf8");
    assert(inbox.includes("[ASK] tester: whats up"), "/ask lines are tagged with [ASK]");

    // 4) public chat reply
    fs.appendFileSync("./ai_outbox.log", "*|Hello everyone!\n");
    await new Promise((r) => setTimeout(r, 1500));
    assert(server.spoken.some((s) => s.includes("Hello everyone!")), "public (*) reply reaches all players");
    assert(server.spoken.some((s) => s.includes("Aria: Hello everyone!")), "public reply appears in the chat buffer as a normal player");

    // 5) targeted reply to online player
    server.online["tester"] = { speak(t) { server.spoken.push(t); } };
    fs.appendFileSync("./ai_outbox.log", "tester|only for you\n");
    await new Promise((r) => setTimeout(r, 1500));
    assert(server.spoken.some((s) => s.includes("only for you")), "targeted reply reaches that player");

    // 6) mods reply
    fs.appendFileSync("./ai_outbox.log", "mods|staff only msg\n");
    await new Promise((r) => setTimeout(r, 1500));
    assert(server.modspoken.some((s) => s.includes("staff only msg")), "mods reply reaches moderators only");

    // 7) state offset: restart does not re-broadcast
    const spokenBefore = server.spoken.length;
    const relay2 = new AiRelay(server);
    relay2.start();
    await new Promise((r) => setTimeout(r, 1500));
    assert(server.spoken.length === spokenBefore, "restart does NOT re-broadcast old lines (state offset)");

    // 8) malformed line ignored
    fs.appendFileSync("./ai_outbox.log", "this has no pipe\n");
    await new Promise((r) => setTimeout(r, 1500));
    assert(server.spoken.length === spokenBefore, "malformed line (no |) is ignored");

    relay.stop();
    relay2.stop();

    process.chdir(os.tmpdir());
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
