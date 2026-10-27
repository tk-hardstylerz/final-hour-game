"use strict";
// Integration test using the REAL compiled modules (same load order as the real server)
// to verify powerups actually work at runtime (circular deps, instanceof chains, etc.).
process.env.FH_NO_DISCORD = "1";

const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

// Load in the same order the real server does: server.ts requires event_handeler first,
// which pulls in Player -> zomby_game -> powerups -> zomby (full circular soup).
D("event_handeler.js");

const Zomby_game = D("zomby_game.js").default;
const Zomby = D("objects/zomby.js").default;
const Player = D("objects/player.js").default;
const Weapon_manager = D("weaponmanager.js").default;
const Weapon = D("weapon.js").default;
const Powerup = D("powerups/powerup.js").default;
const LongtimePowerup = D("powerups/long_time_powerup.js").default;
const MaxAmmo = D("powerups/max_ammo.js").default;
const Instakill = D("powerups/instakill.js").default;
const DoublePoints = D("powerups/double_points.js").default;
const Nuke = D("powerups/nuke.js").default;

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

function make_game() {
    const game = Object.create(Zomby_game.prototype);
    game.gotten_powerups = 0;
    game.possible_powerups = [MaxAmmo, DoublePoints, Instakill, Nuke];
    game.current_long_time_powerups = [];
    game.instakill = false;
    game.double_points = false;
    game.players = [];
    game.killed_zombies = 0;
    game.scores = {};
    return game;
}

function make_player(game, name) {
    const p = Object.create(Player.prototype);
    p.game = game;
    p.name = name;
    p.character = null;
    p.sent = [];
    p.play_direct = function () {};
    p.speak = function () {};
    p.send = function (channel, event, data) {
        this.sent.push({ channel, event, data });
    };
    p.reset_to_defaults = function () {};
    return p;
}

function make_zomby(game) {
    const z = Object.create(Zomby.prototype);
    z.game = game;
    z.map = {
        send_area() {},
        send() {},
        remove_object() {},
        get_objects_at() {
            return [];
        },
        get_tile_at() {
            return "floor";
        },
        objects: { get: () => [] },
    };
    z.server = {};
    z.hp = 100;
    z.dead = false;
    z.destroied = false;
    z.name = "zomby_test";
    z.points_reward = 100;
    z.sound_path = "entities/zomby";
    z.volume = 80;
    z.destroy_time = 1000;
    z.cry_timer = { restart() {} };
    z.play_sound = function () {};
    z.play_direct = function () {};
    z.wrappedEvents = { emit() {} };
    z.events = {};
    z.tickExecutor = { cancel() {} };
    return z;
}

(async () => {
    // ---- 1) module identity / instanceof chain (real classes) ----
    assert(Instakill.prototype instanceof LongtimePowerup, "Instakill extends LongtimePowerup (real chain)");
    assert(DoublePoints.prototype instanceof LongtimePowerup, "DoublePoints extends LongtimePowerup (real chain)");
    assert(MaxAmmo.prototype instanceof Powerup, "MaxAmmo extends Powerup");
    assert(!(MaxAmmo.prototype instanceof LongtimePowerup), "MaxAmmo is NOT a LongtimePowerup");
    assert(Nuke.prototype instanceof Powerup, "Nuke extends Powerup");

    const game = make_game();
    const ik = new Instakill(game);
    assert(ik instanceof LongtimePowerup, "constructed Instakill instanceof LongtimePowerup");
    assert(ik instanceof Zomby_game === false, "Instakill is NOT instanceof Zomby_game");

    // ---- 2) FORCED instakill: must be added to long-time list + flag set ----
    const g2 = make_game();
    g2.players = [];
    await g2.randomize_powerup(100, [Instakill]);
    assert(g2.gotten_powerups === 1, "forced instakill: exactly 1 powerup activated");
    assert(g2.current_long_time_powerups.length === 1, "forced instakill: added to long-time list");
    assert(g2.instakill === true, "forced instakill: game.instakill === true");
    const ikChosen = g2.current_long_time_powerups[0];
    assert(ikChosen instanceof Instakill, "list contains an Instakill instance");
    assert(ikChosen.is_active === true, "instakill is_active === true");
    assert(ikChosen.active_timer.elapsed < 1000, "instakill timer just started (< 1s)");

    // ---- 3) loop() does NOT immediately deactivate an active powerup ----
    await g2.loop();
    assert(g2.current_long_time_powerups.length === 1, "loop() keeps the active powerup (no instant deactivate)");
    assert(g2.instakill === true, "instakill still active after loop()");

    // ---- 3b) forced double points ----
    const g3 = make_game();
    g3.players = [];
    await g3.randomize_powerup(100, [DoublePoints]);
    assert(g3.current_long_time_powerups.length === 1, "forced double points: added to long-time list");
    assert(g3.double_points === true, "forced double points: game.double_points === true");

    // ---- 3c) forced MaxAmmo is NOT added to long-time list (not a LongtimePowerup) ----
    const g3c = make_game();
    g3c.players = [];
    await g3c.randomize_powerup(100, [MaxAmmo]);
    assert(g3c.current_long_time_powerups.length === 0, "forced MaxAmmo: NOT added to long-time list (correct)");

    // ---- 4) already-active longtime powerup is skipped; another is chosen ----
    const g4skip = make_game();
    g4skip.players = [];
    await g4skip.randomize_powerup(100, [Instakill, DoublePoints]);
    await g4skip.randomize_powerup(100, [Instakill, DoublePoints]);
    // Call 1 picks one of them; call 2 must NOT duplicate it and must pick the OTHER one.
    assert(g4skip.current_long_time_powerups.length === 2, "2nd call added the OTHER powerup (no duplication)");
    const active = g4skip.current_long_time_powerups[0];
    const otherFlag = active instanceof Instakill ? g4skip.double_points : g4skip.instakill;
    assert(otherFlag === true, "the OTHER long-time powerup was activated on 2nd call");

    // ---- 5) max ammo refills real weapons and sends modify_weapon ----
    const g4 = make_game();
    const p1 = make_player(g4, "P1");
    const wm = new Weapon_manager({}, p1);
    const w1 = new Weapon({
        server: {},
        owner: p1,
        name: "M1911",
        max_ammo: 12,
        max_reserved_ammo: 24,
        ammo: 0,
        reserved_ammo: 0,
    });
    const w2 = new Weapon({
        server: {},
        owner: p1,
        name: "Shotgun",
        melee: false,
        max_ammo: 6,
        max_reserved_ammo: 30,
        ammo: 0,
        reserved_ammo: 0,
    });
    wm.add(w1, false);
    wm.add(w2, false);
    p1.weapon_manager = wm;
    g4.players = [p1];
    const ma = new MaxAmmo(g4);
    await ma.activate();
    assert(w1.ammo === 12 && w1.reserved_ammo === 24, "max ammo refilled weapon 1");
    assert(w2.ammo === 6 && w2.reserved_ammo === 30, "max ammo refilled weapon 2");
    const sentModify = p1.sent.filter((s) => s.event === "modify_weapon");
    assert(sentModify.length === 2, "modify_weapon sent to client for both weapons (" + sentModify.length + ")");

    // ---- 6) instakill: zomby dies in one hit (full hp damage) ----
    const g5 = make_game();
    g5.instakill = true;
    const z5 = make_zomby(g5);
    z5.hp = 100;
    z5.on_hit({ name: "shooter" }, 10);
    assert(z5.hp <= 0, "instakill: zomby hp dropped to <= 0 from a 10 dmg hit (hp=" + z5.hp + ")");
    assert(z5.dead === true, "instakill: zomby died from one hit");

    // ---- 7) instakill OFF: same hit does NOT kill ----
    const g6 = make_game();
    g6.instakill = false;
    const z6 = make_zomby(g6);
    z6.hp = 100;
    z6.on_hit({ name: "shooter" }, 10);
    assert(z6.hp === 90 && z6.dead === false, "no instakill: 10 dmg leaves hp=90 (hp=" + z6.hp + ")");

    // ---- 8) double points: score doubles ----
    const g7 = make_game();
    g7.double_points = true;
    g7.scores["P1"] = { kills: 0, points: 0 };
    const p7 = make_player(g7, "P1");
    const z7 = make_zomby(g7);
    z7.points_reward = 100;
    z7.death(p7);
    assert(g7.scores["P1"].points === 200, "double points: 100 reward -> 200 points (got " + g7.scores["P1"].points + ")");

    const g8 = make_game();
    g8.double_points = false;
    g8.scores["P1"] = { kills: 0, points: 0 };
    const p8 = make_player(g8, "P1");
    const z8 = make_zomby(g8);
    z8.points_reward = 100;
    z8.death(p8);
    assert(g8.scores["P1"].points === 100, "normal: 100 reward -> 100 points (got " + g8.scores["P1"].points + ")");

    // ---- 9) nuke destroys only zomby objects (control) ----
    const g9 = make_game();
    const zombieObj = make_zomby(g9);
    const otherObj = { foo: 1, destroied: false, destroy() { this.destroied = true; } };
    g9.map = {
        objects: { get: () => [zombieObj, otherObj] },
    };
    const nuke = new Nuke(g9);
    await nuke.activate();
    assert(otherObj.destroied === false, "nuke did NOT destroy the non-zomby object (only Zomby instances)");
    assert(zombieObj.destroied === true, "nuke destroyed the zomby");

    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
