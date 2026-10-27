"use strict";
// Integration test using the REAL compiled modules to verify the COD-style builder
// flow works end to end: open_builder -> type select -> coordinate choice ->
// (position mode | typed coordinates) -> params -> line written to the map.
process.env.FH_NO_DISCORD = "1";

const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

D("event_handeler.js");

const Event_handeler = D("event_handeler.js").default;

let pass = 0;
let fail = 0;
function assert(cond, name) {
    if (cond) {
        pass++;
        console.log("PASS:", name);
    } else {
        fail++;
        console.log("FAIL:", name);
    }
}

function make_player(name) {
    const p = {
        name,
        builder: true,
        moderator: false,
        contributor: false,
        x: 5,
        y: 6,
        z: 0,
        sent: [],
        speech: [],
        map: {
            real_data: "bounds 0 10 0 10 0 10\n",
            update: async function (text) {
                this.real_data = text;
            },
        },
        send: function (channel, event, data) {
            this.sent.push({ channel, event, data });
        },
        speak: function (msg) {
            this.speech.push(msg);
        },
    };
    return p;
}

const flush = () => new Promise((r) => setImmediate(r));

(async () => {
    const handler = new Event_handeler({ get_by_peer: () => undefined });
    const fire = (peer, ev, data) => handler.events[ev].bind(handler)(peer, data);

    // ---- 1) open_builder sends the builder menu (COD-style title + types) ----
    const peer1 = "peer1";
    const player = make_player("Tester");
    handler.server.get_by_peer = (p) => (p === peer1 ? player : undefined);
    fire(peer1, "open_builder", {});
    const builderMenu = player.sent.find((s) => s.event === "make_menu" && s.data.event === "builder_select");
    assert(!!builderMenu, "open_builder: sends make_menu with event builder_select");
    assert(builderMenu && builderMenu.data.title.includes("Builder menu"), "open_builder: COD-style title");
    const types = builderMenu ? builderMenu.data.options.map((o) => o.value) : [];
    for (const t of ["platform", "wall", "zone", "reverb", "soundSource", "ambience", "Music", "playerSpawn", "zombieSpawn", "door", "window", "perkMachine", "wallbuy", "powerSwitch", "interactable"]) {
        assert(types.includes(t), "builder menu includes type: " + t);
    }

    // ---- 2) builder_select starts the coordinate phase ----
    player.sent = [];
    fire(peer1, "builder_select", { value: "platform" });
    const coordsChoice = player.sent.find((s) => s.event === "make_menu" && s.data.event === "builder_coords");
    assert(!!coordsChoice, "builder_select: asks how to specify coordinates");
    assert(coordsChoice && coordsChoice.data.options.map((o) => o.value).join() === "position,coords", "builder_select: position/coords options");
    assert(coordsChoice && coordsChoice.data.options.map((o) => o.title).join() === "Use player position,Type coordinates", "builder_select: friendly option titles");

    // ---- 3) "Type coordinates": 6 prompts with player position defaults ----
    fire(peer1, "builder_coords", { value: "coords" });
    const c0 = player.sent[player.sent.length - 1];
    assert(c0 && c0.event === "make_input" && c0.data.event === "builder_coord_param", "coords: first field is an input");
    assert(c0 && c0.data.default === "5", "coords: minx default = player x (got " + (c0 && c0.data.default) + ")");
    assert(c0 && c0.data.prompt.includes("minimum x"), "coords: first prompt asks minimum x");

    const coordVals = [["5", "7"], ["6", "8"], ["0", "0"]];
    for (const [min, max] of coordVals) {
        fire(peer1, "builder_coord_param", { value: min });
        const next = player.sent[player.sent.length - 1];
        assert(next && next.event === "make_input", "coords: continues prompting while fields remain");
        fire(peer1, "builder_coord_param", { value: max });
    }

    // after 6 fields -> params phase (platform material menu)
    const matMenu = player.sent[player.sent.length - 1];
    assert(matMenu && matMenu.event === "make_menu" && matMenu.data.event === "builder_menu_param", "coords: after fields, prompts for material");
    assert(matMenu && matMenu.data.title.includes("material"), "coords: material prompt (got " + (matMenu && matMenu.data.title) + ")");

    // ---- 4) final param -> line written with explicit bounds ----
    const dataBefore = player.map.real_data;
    fire(peer1, "builder_menu_param", { value: "wood" });
    await flush();
    assert(player.map.real_data !== dataBefore, "build: map data updated");
    assert(player.map.real_data.includes("platform 5 7 6 8 0 0 wood"), "build: explicit-bounds platform line written (got: " + player.map.real_data.split("\n").filter(Boolean).pop() + ")");
    assert(player.speech.some((m) => m.includes("platform placed")), "build: confirmation spoken");

    // ---- 5) position mode: skips coordinate prompts, goes straight to params ----
    const peer2 = "peer2";
    const player2 = make_player("Tester2");
    handler.server.get_by_peer = (p) => (p === peer2 ? player2 : p === peer1 ? player : undefined);
    fire(peer2, "builder_select", { value: "zone" });
    fire(peer2, "builder_coords", { value: "position" });
    const zoneInput = player2.sent[player2.sent.length - 1];
    assert(zoneInput && zoneInput.event === "make_input" && zoneInput.data.event === "builder_next_param", "position: skips coords, asks zone text");
    fire(peer2, "builder_next_param", { value: "my zone" });
    await flush();
    assert(player2.map.real_data.includes("zone 0 10 1 11 -2 2 my zone"), "position: zone line centered on player (got: " + player2.map.real_data.split("\n").filter(Boolean).pop() + ")");

    // ---- 6) no-params type in position mode places immediately ----
    const peer3 = "peer3";
    const player3 = make_player("Tester3");
    handler.server.get_by_peer = (p) => (p === peer3 ? player3 : p === peer2 ? player2 : p === peer1 ? player : undefined);
    fire(peer3, "builder_select", { value: "interactable" });
    fire(peer3, "builder_coords", { value: "position" });
    await flush();
    assert(player3.map.real_data.includes("interactable 5 5 6 6 0 0"), "position: interactable placed at player position (got: " + player3.map.real_data.split("\n").filter(Boolean).pop() + ")");

    // ---- 7) permission check: non-builder cannot open builder ----
    const peer4 = "peer4";
    const player4 = make_player("Tester4");
    player4.builder = false;
    handler.server.get_by_peer = (p) => (p === peer4 ? player4 : undefined);
    fire(peer4, "open_builder", {});
    assert(!player4.sent.some((s) => s.event === "make_menu"), "permission: non-builder gets no builder menu");

    // ---- 8) typed coordinates apply to point elements (perkMachine) ----
    const peer5 = "peer5";
    const player5 = make_player("Tester5");
    handler.server.get_by_peer = (p) => (p === peer5 ? player5 : p === peer4 ? player4 : undefined);
    fire(peer5, "builder_select", { value: "perkMachine" });
    fire(peer5, "builder_coords", { value: "coords" });
    for (const v of ["3", "3", "4", "4", "1", "1"]) {
        fire(peer5, "builder_coord_param", { value: v });
    }
    const perkMenu = player5.sent[player5.sent.length - 1];
    assert(perkMenu && perkMenu.event === "make_menu" && perkMenu.data.event === "builder_menu_param", "perkMachine: after coords asks which perk");
    fire(peer5, "builder_menu_param", { value: "staminup" });
    await flush();
    assert(player5.map.real_data.includes("perkMachine 3 3 4 4 1 1 perk=staminup sound=perks/music/staminup.ogg"), "perkMachine: typed bounds + perk line (got: " + player5.map.real_data.split("\n").filter(Boolean).pop() + ")");

    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
