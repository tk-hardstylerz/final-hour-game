"use strict";
// Integration test using the REAL compiled modules (same load order as the real server)
// to verify perks actually work at runtime (attach/detach, perk machine purchase,
// juggernog HP, quick revive solo self-revive, events sent to client).
process.env.FH_NO_DISCORD = "1";

const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

// Load in the same order the real server does (event_handeler first -> full circular soup).
D("event_handeler.js");

const Player = D("objects/player.js").default;
const Perk = D("perks/perk.js").default;
const PerkManager = D("perk_manager.js").default;
const PerkMachine = D("objects/perk_machine.js").default;
const Juggernog = D("perks/juggernog.js").default;
const QuickRevive = D("perks/quick_revive.js").default;
const double_tap_root_beer = D("perks/double_tap_root_beer.js").default;
const speed_cola = D("perks/speed_cola.js").default;
const Staminup = D("perks/staminup.js").default;
const WhosWho = D("perks/whos_who.js").default;

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

function make_game(solo = true) {
    const game = {
        started: true,
        zomby_game: true,
        players: [],
        scores: {},
        speak() {},
        end() {
            this._ended = true;
        },
        call_after(ms, fn) {
            (this._afters = this._afters || []).push({ ms, fn });
        },
        map: { objects: { get() { return []; } } },
    };
    game.players.size = solo ? 1 : 2;
    game.get_dead_players = () => game.players.filter((p) => p.dead).length;
    return game;
}

function make_player(game, name) {
    const p = Object.create(Player.prototype);
    p.game = game;
    p.name = name;
    p.user = { username: name };
    p.character = null;
    p.sent = [];
    p.speech = [];
    p.hp = 500;
    p.maxHp = 500;
    p.dead = false;
    p.quick_revive = false;
    p.whos_who = false;
    p.speed_cola = false;
    p.double_tap_root_beer = false;
    p.revive_time = 60000;
    p.revive_timer = { elapsed: 0, restart() { this.elapsed = 0; } };
    p.health_timer = { elapsed: 999999, restart() {} };
    p.revivable_sound = false;
    p.low_health = false;
    p.isFalling = false;
    p.perks = new PerkManager({}, p);
    p.send = function (channel, event, data) {
        this.sent.push({ channel, event, data });
    };
    p.speak = function (msg) {
        this.speech.push(msg);
    };
    p.play_sound = function () {};
    p.play_direct = function () {};
    p.start_low_health_sound = function () {};
    p.stop_low_health_sound = function () {};
    p.weapon_manager = { active_weapon: null };
    game.players.push(p);
    game.scores[name] = { points: 2000, kills: 0 };
    return p;
}

function make_machine(perkType, opts = {}) {
    const m = Object.create(PerkMachine.prototype);
    m.isActive = opts.isActive ?? true;
    m.map = { isPowerOn: opts.isPowerOn ?? true };
    m.quantity = opts.quantity ?? Infinity;
    m.price = opts.price ?? 1500;
    m.allowDuplicate = opts.allowDuplicate ?? false;
    m.perkType = perkType;
    m.name = "PerkMachine";
    m.server = {};
    return m;
}

(async () => {
    // ---- 1) module identity / instanceof chain (real classes) ----
    for (const [cls, name] of [
        [Juggernog, "Juggernog"],
        [QuickRevive, "QuickRevive"],
        [double_tap_root_beer, "double_tap_root_beer"],
        [speed_cola, "speed_cola"],
        [Staminup, "Staminup"],
        [WhosWho, "whos_who"],
    ]) {
        assert(cls.prototype instanceof Perk, `${name} extends Perk (real chain)`);
        assert(typeof cls.perkName === "string", `${name} has static perkName`);
    }

    // ---- 2) PerkManager basics ----
    const g0 = make_game();
    const p0 = make_player(g0, "P0");
    assert(p0.perks.findFirstEmptySlot() === 0, "perk manager: first empty slot is 0");
    assert(p0.perks.assignedPerks === 0, "perk manager: 0 assigned perks initially");
    assert(p0.perks.perks.length === 6, "perk manager: 6 perk slots (got " + p0.perks.perks.length + ")");

    // ---- 3) Juggernog attach/detach (server-side HP) ----
    const gj = make_game();
    const pj = make_player(gj, "PJ");
    const jug = new Juggernog({});
    await pj.perks.setPerkOnSlot(0, jug);
    assert(pj.maxHp === 650, "juggernog: maxHp 500 -> 650 (got " + pj.maxHp + ")");
    assert(pj.hp === 650, "juggernog: hp filled to 650 (got " + pj.hp + ")");
    const setHpEvt = pj.sent.find((s) => s.event === "set_hp");
    assert(!!setHpEvt, "juggernog: set_hp event sent to client");
    assert(setHpEvt && setHpEvt.data.amount === 650, "juggernog: set_hp amount is 650 (got " + (setHpEvt && setHpEvt.data.amount) + ")");
    assert(setHpEvt && setHpEvt.data.max === 650, "juggernog: set_hp carries max=650 (client can display boosted HP) (got " + (setHpEvt && setHpEvt.data.max) + ")");
    assert(pj.perks.isPerkAssigned(Juggernog), "juggernog: isPerkAssigned(Juggernog) true");

    pj.perks.unsetPerkFromSlot(0);
    assert(pj.maxHp === 500 && pj.hp === 500, "juggernog: detach restores 500/500 (got " + pj.maxHp + "/" + pj.hp + ")");

    // ---- 4) Staminup sends events ----
    const gs = make_game();
    const ps = make_player(gs, "PS");
    await ps.perks.setPerkOnSlot(0, new Staminup({}));
    const stOn = ps.sent.find((s) => s.event === "staminup");
    assert(stOn && stOn.data.value === true, "staminup: attach sends staminup {value:true}");
    assert(stOn && stOn.channel === 0, "staminup: event on channel_misc (0)");
    ps.perks.unsetPerkFromSlot(0);
    const stOff = ps.sent.find((s) => s.event === "staminup" && s.data.value === false);
    assert(!!stOff, "staminup: detach sends staminup {value:false}");

    // ---- 5) speed_cola sets flag + sends event ----
    const gsc = make_game();
    const psc = make_player(gsc, "PSC");
    await psc.perks.setPerkOnSlot(0, new speed_cola({}));
    assert(psc.speed_cola === true, "speed_cola: server flag speed_cola=true");
    const scOn = psc.sent.find((s) => s.event === "speed_cola");
    assert(scOn && scOn.data.value === true, "speed_cola: attach sends speed_cola {value:true}");
    assert(scOn && scOn.channel === 7, "speed_cola: event on channel_weapons (7)");
    psc.perks.unsetPerkFromSlot(0);
    assert(psc.speed_cola === false, "speed_cola: detach resets server flag to false");
    const scOff = psc.sent.find((s) => s.event === "speed_cola" && s.data.value === false);
    assert(!!scOff, "speed_cola: detach sends speed_cola {value:false}");

    // ---- 6) double_tap_root_beer sends event ----
    const gdt = make_game();
    const pdt = make_player(gdt, "PDT");
    await pdt.perks.setPerkOnSlot(0, new double_tap_root_beer({}));
    const dtOn = pdt.sent.find((s) => s.event === "double_tap_root_beer");
    assert(dtOn && dtOn.data.value === true, "double tap: attach sends double_tap_root_beer {value:true}");
    assert(dtOn && dtOn.channel === 7, "double tap: event on channel_weapons (7)");
    pdt.perks.unsetPerkFromSlot(0);
    const dtOff = pdt.sent.find((s) => s.event === "double_tap_root_beer" && s.data.value === false);
    assert(!!dtOff, "double tap: detach sends double_tap_root_beer {value:false}");

    // ---- 7) QuickRevive: solo self-revive ----
    const gq = make_game(true);
    const pq = make_player(gq, "PQ");
    await pq.perks.setPerkOnSlot(0, new QuickRevive({}));
    assert(pq.quick_revive === true, "quick revive: quick_revive flag = true after attach");
    pq.kill();
    assert(pq.dead === true, "quick revive: player is dead after kill()");
    assert(pq.revive_time === 30000, "quick revive: revive_time = 30000 after death (got " + pq.revive_time + ")");
    assert(pq.perks.assignedPerks === 0, "quick revive: perks cleared on death");
    assert(pq.quick_revive === false, "quick revive: perk detached (quick_revive=false)");
    assert(gq._ended !== true, "quick revive: SOLO game does NOT end (can self-revive)");

    pq.revive_timer.elapsed = 30001;
    const revived = pq.on_interact(pq, 0, 0);
    assert(revived === true, "quick revive: on_interact allows self-revive (returns true)");
    assert(pq.dead === false, "quick revive: player self-revived (dead=false)");
    assert(pq.hp === pq.maxHp, "quick revive: hp restored to max after revive");
    assert(pq.revive_time === 60000, "quick revive: revive_time reset to 60000 after revive");

    // ---- 8) NO quick revive solo: game must end (when Aria rescues are exhausted) ----
    const gn = make_game(true);
    const pn = make_player(gn, "PN");
    pn.aria_revives = 0;
    pn.kill();
    assert(pn.dead === true, "no quick revive: player dead");
    assert(gn._ended === true, "no quick revive: SOLO game ends (no rescues left)");

    // ---- 9) Whos Who: death keeps perks, self-revive anytime (any player count) ----
    const gw = make_game(false);
    const pw = make_player(gw, "PW");
    await pw.perks.setPerkOnSlot(0, new WhosWho({}));
    assert(pw.whos_who === true, "whos who: flag set after attach");
    pw.kill();
    assert(pw.dead === true, "whos who: player is dead after kill()");
    assert(pw.revive_time === 30000, "whos who: revive_time = 30000 after death (got " + pw.revive_time + ")");
    assert(pw.perks.assignedPerks === 1, "whos who: perks RETAINED on death (got " + pw.perks.assignedPerks + ")");
    assert(pw.whos_who === true, "whos who: perk still attached after death");
    assert(gw._ended !== true, "whos who: game does NOT end (can self-revive)");

    pw.revive_timer.elapsed = 30001;
    const wwRevived = pw.on_interact(pw, 0, 0);
    assert(wwRevived === true, "whos who: on_interact allows self-revive even in MULTIPLAYER (returns true)");
    assert(pw.dead === false, "whos who: player self-revived (dead=false)");
    assert(pw.hp === pw.maxHp, "whos who: hp restored to max after revive");
    assert(pw.revive_time === 60000, "whos who: revive_time reset to 60000 after revive");
    assert(pw.perks.assignedPerks === 1, "whos who: perks still retained after revive");
    assert(pw.whos_who === true, "whos who: perk still attached after revive");

    pw.perks.unsetPerkFromSlot(0);
    assert(pw.whos_who === false, "whos who: flag cleared on detach");

    // whos_who without perk: normal death clears perks
    const gw2 = make_game(true);
    const pw2 = make_player(gw2, "PW2");
    pw2.aria_revives = 0;
    pw2.kill();
    assert(pw2.revive_time === 60000, "no whos who: revive_time stays 60000 (got " + pw2.revive_time + ")");
    assert(gw2._ended === true, "no whos who: SOLO game ends");

    // ---- 10) Aria rescue (solo, max 2) ----
    const ga = make_game(true);
    const pa = make_player(ga, "PA");
    pa.aria_revives = 2;
    const chatSent = [];
    pa.server = {
        language_channels: {
            english: {
                send(line, user, buffer) {
                    chatSent.push({ line, buffer });
                },
            },
        },
    };
    pa.kill();
    assert(pa.dead === true, "aria: player dead after kill()");
    assert(ga._ended !== true, "aria: SOLO game does NOT end while rescues remain");
    assert(ga._afters && ga._afters.length === 2, "aria: rescue scheduled (2 delayed calls, got " + (ga._afters && ga._afters.length) + ")");
    assert(pa.aria_revives === 1, "aria: rescues decremented to 1 (got " + pa.aria_revives + ")");
    let announceCall = null;
    let reviveCall = null;
    for (const a of ga._afters) {
        if (a.ms === 1200) announceCall = a.fn;
        if (a.ms === 4000) reviveCall = a.fn;
    }
    assert(!!announceCall && !!reviveCall, "aria: delayed callbacks scheduled (1200ms announce, 4000ms revive)");
    announceCall();
    assert(
        chatSent.length === 1 &&
            chatSent[0].buffer === "chat" &&
            chatSent[0].line.startsWith("Aria: "),
        "aria: rescue announced in the public chat as Aria (normal player)"
    );
    assert(pa.dead === true, "aria: player still dead before the revive delay");
    reviveCall();
    assert(pa.dead === false, "aria: player revived by Aria (dead=false)");
    assert(pa.hp === pa.maxHp, "aria: hp restored after Aria revive");
    assert(
        chatSent.some((c) => c.buffer === "chat" && c.line.includes("was revived by Aria")),
        "aria: revive message also posted in the public chat"
    );

    // second death: last rescue
    pa.kill();
    assert(ga._ended !== true, "aria: last rescue still avoids game end");
    assert(pa.aria_revives === 0, "aria: rescues exhausted after 2nd save");
    for (const a of ga._afters) if (a.ms === 4000) reviveCall = a.fn;
    reviveCall();
    assert(pa.dead === false, "aria: player revived on last rescue");

    // third death: no rescues left -> game ends
    pa.kill();
    assert(ga._ended === true, "aria: after max rescues (2), SOLO game ends on 3rd death");

    // multiplayer all-dead: Aria does NOT save
    const gm4 = make_game(false);
    const pm4 = make_player(gm4, "PM4");
    pm4.aria_revives = 2;
    make_player(gm4, "PM5");
    gm4.players[1].dead = true;
    gm4.players[1].revive_time = 60000;
    pm4.kill();
    assert(gm4._ended === true, "aria: MULTIPLAYER all-dead still ends the game (no solo save)");
    assert(pm4.aria_revives === 2, "aria: rescues NOT consumed in multiplayer");

    // ---- 11) Perk machine purchase flow ----
    const gm = make_game(true);
    const pm1 = make_player(gm, "PM1");
    const machine = make_machine(Juggernog, { price: 1500 });
    machine.on_interact(pm1, 0, 0);
    await new Promise((r) => setImmediate(r));
    assert(pm1.points === 500, "machine: price 1500 deducted from 2000 (got " + pm1.points + ")");
    assert(pm1.maxHp === 650, "machine: juggernog applied via machine (maxHp 650)");
    assert(pm1.perks.assignedPerks === 1, "machine: perk assigned to a slot");
    assert(pm1.speech.some((m) => m.includes("It's now active")), "machine: speaks purchase confirmation");

    // duplicate purchase refused
    const dupBefore = pm1.sent.length;
    machine.on_interact(pm1, 0, 0);
    assert(pm1.perks.assignedPerks === 1, "machine: duplicate purchase refused (still 1 perk)");
    assert(pm1.speech.some((m) => m.includes("Can't buy another")), "machine: duplicate message spoken");
    assert(pm1.points === 500, "machine: no points deducted for duplicate purchase");

    // not powered -> refused
    const gm2 = make_game(true);
    const pm2 = make_player(gm2, "PM2");
    const off = make_machine(Juggernog, { isPowerOn: false });
    off.on_interact(pm2, 0, 0);
    assert(pm2.perks.assignedPerks === 0, "machine: no purchase when power is off");
    assert(pm2.speech.some((m) => m.includes("not operational")), "machine: 'not operational' spoken when power off");
    assert(pm2.maxHp === 500, "machine: no HP change when power is off");

    // insufficient points -> refused
    const gm3 = make_game(true);
    const pm3 = make_player(gm3, "PM3");
    gm3.scores["PM3"].points = 100;
    const expensive = make_machine(Juggernog, { price: 1500 });
    expensive.on_interact(pm3, 0, 0);
    assert(pm3.perks.assignedPerks === 0, "machine: no purchase with insufficient points");
    assert(pm3.speech.some((m) => m.includes("points to use")), "machine: 'need points' message spoken");

    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();
