"use strict";
// Unit test for GroqAi using the real compiled module.
process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const os = require("os");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "groqtest-"));
process.chdir(tmp);

const D = (p) => require(path.join(__dirname, "dist", "libs", p));
D("event_handeler.js");
const GroqAi = D("groq_ai.js").default;

let pass = 0;
let fail = 0;
function assert(cond, name) {
    if (cond) { pass++; console.log("PASS:", name); }
    else { fail++; console.log("FAIL:", name); }
}

(async () => {
    const ai = new GroqAi();

    // no key file -> disabled
    ai.load();
    assert(ai.enabled === false, "groq: disabled when no key file");

    // placeholder key text -> disabled
    fs.writeFileSync("groq_key.txt", "Paste your Groq API key here (one line, no quotes).\n");
    ai.load();
    assert(ai.enabled === false, "groq: disabled when key file has placeholder text");

    // real-looking key -> enabled
    fs.writeFileSync("groq_key.txt", "gsk-FakeKey123\n");
    ai.load();
    assert(ai.enabled === true, "groq: enabled with a real-looking key");

    // context file is read
    fs.writeFileSync("ai_fh_context.txt", "Final Hour context here\n");
    ai.load();
    assert(ai.enabled === true, "groq: context file read does not disable");

    // ask without network -> throws (we mock axios below)
    let threw = false;
    try {
        await ai.ask("hello", "tester");
    } catch (e) {
        threw = true;
    }
    assert(threw, "groq: ask without connectivity throws");

    process.chdir(os.tmpdir());
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
