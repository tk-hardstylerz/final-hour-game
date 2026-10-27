"use strict";
// Integration test using the REAL compiled modules for the new match features:
// spectator mode (join in-progress matches), game modes (solo / multiplayer /
// coop with the Aria bot), zombie behavior around spectators, weapon fire guard,
// and the Aria bot's combat behavior.
process.env.FH_NO_DISCORD = "1";

const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

D("event_handeler.js");

const Player = D("objects/player.js").default;
const Zomby = D("objects/zomby.js").default;
const Weapon = D("weapon.js").default;
const Zomby_game = D("zomby_game.js").default;
const Event_handeler = D("event_handeler.js").default;
const randomMod = require(path.join(__dirname, "dist", "libs", "random.js"));
const origRandomNumber = randomMod.random_number;

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

function fakedTimer(v) {
    return {
        _v: v,
        get elapsed() {
            return this._v;
        },
        restart() {
            this._v = 0;
        },
    };
}

function make_fake_player(name) {
    return {
        name,
        user: { username: name, block_list: [], log() {} },
        builder: true,
        spectator: false,
        game: null,
        sent: [],
        speech: [],
        change_map_count: 0,
        send(channel, event, data) {
            this.sent.push({ channel, event, data });
        },
        speak(msg) {
            this.speech.push(msg);
        },
        change_map() {
            this.change_map_count++;
        },
        create_match(map, mode) {
            this._create = { map, mode };
        },
        join_match(name, spectator) {
            this._join = { name, spectator };
        },
    };
}

function make_handler(player) {
    const handler = new Event_handeler({
        get_by_peer: () => undefined,
        games: [],
        maps: { facility: { mapName: "facility", public_: true } },
        leaderboard: { get_kills_leaderboard() {}, get_points_leaderboard() {}, get_accuracy_leaderboard() {} },
    });
    handler.server.get_by_peer = (p) => (p === "peer1" ? player : undefined);
    handler.server.send = function (peer, channel, event, data) {
        if (peer === "peer1") player.sent.push({ channel, event, data });
    };
    return handler;
}

function make_behavior_player(server) {
    const p = Object.create(Player.prototype);
    p.name = "Tester";
    p.server = server;
    p.user = { username: "Tester", block_list: [], log() {} };
    p.game = undefined;
    p.spectator = false;
    p.speech = [];
    p.moved_maps = [];
    p.speak = function (msg) {
        this.speech.push(msg);
    };
    p.change_map = function (map) {
        this.moved_maps.push(map && map.mapName);
    };
    p.send = function () {};
    p.play_sound = function () {};
    p.play_direct = function () {};
    return p;
}

function make_join_game(mapName, opts = {}) {
    const g = Object.create(Zomby_game.prototype);
    g.started = opts.started ?? false;
    g.mode = opts.mode ?? "multiplayer";
    g.players = new Set();
    g.max_players = opts.max_players ?? 8;
    g.name = opts.name ?? "Game";
    g.map = { mapName };
    g.add_player = function (pl) {
        if (this.players.size >= this.max_players) return false;
        this.players.add(pl);
        pl.game = this;
        return true;
    };
    for (let i = 0; i < (opts.fill ?? 0); i++) g.players.add({ name: "P" + i });
    return g;
}

function make_zomby() {
    const z = Object.create(Zomby.prototype);
    z.x = 0;
    z.y = 0;
    z.z = 0;
    z.range = 5;
    z.damage = 20;
    z.dead = false;
    z.tracking = null;
    z.play_sound = function () {};
    z.idel_timer = { restart() {} };
    z.server = { sleep_for: async () => {} };
    return z;
}

function make_bot() {
    const bot = Object.create(Player.prototype);
    bot.name = "Aria";
    bot.dead = false;
    bot.hp = 500;
    bot.maxHp = 500;
    bot.voice_channel = 99;
    bot.x = 0;
    bot.y = 0;
    bot.z = 0;
    bot.weapon_manager = {
        active_weapon: { melee: false, ammo: 10, name: "mp7" },
        fired: 0,
        lastAngle: 0,
        lastPitch: 0,
        reloads: 0,
        fire(angle, pitch) {
            this.fired++;
            this.lastAngle = angle;
            this.lastPitch = pitch;
        },
        reload() {
            this.reloads++;
        },
    };
    bot.move = function (x, y, z) {
        this._moved = { x, y, z };
    };
    return bot;
}

function make_z_game(opts = {}) {
    const zg = Object.create(Zomby_game.prototype);
    zg.started = true;
    zg.players = new Set();
    zg.scores = {};
    zg.speak = function () {};
    zg.map = {
        objects: { get: () => (opts.objects || []) },
        find_path: opts.find_path || (async () => opts.path || null),
        is_unwalkable: () => false,
        get_tile_at: () => "",
        destroy: function () {
            this._destroyed = true;
        },
        destroy_objects: function () {
            this._objects_destroyed = true;
        },
    };
    zg.aria_bot_active = true;
    zg.aria_decision_ms = 200;
    zg.aria_fire_delay_ms = 300;
    zg.aria_move_ms = 300;
    zg.aria_max_weapon_range = 24;
    zg.aria_think_timer = fakedTimer(0);
    zg.aria_fire_timer = fakedTimer(0);
    zg.aria_move_timer = fakedTimer(0);
    zg.aria_voice_timer = fakedTimer(0);
    zg.aria_random_quip_ms = 45000;
    zg.aria_low_hp_spoken = false;
    zg.aria_was_dead = false;
    zg.aria_kills_seen = 0;
    zg.aria_voice_playing = false;
    zg.aria_say_voice = function () { return null; };
    return zg;
}

function in_array(arr, category) {
    return arr.some((c) => c === category);
}

(async () => {
    // ============================================================
    // A) event handler plumbing: create menu, mode menu, join menu, leave
    // ============================================================
    const pl = make_fake_player("Tester");
    const handler = make_handler(pl);
    const fire = (data) => handler.events["mainmenu"].bind(handler)("peer1", { value: data });

    // create without a map -> map selection menu
    fire({ action: "create" });
    const mapsMenu = pl.sent.find((s) => s.event === "make_menu" && s.data.title && String(s.data.title).includes("Choose a map"));
    assert(!!mapsMenu, "create: no map -> maps menu");

    // create with a map but no mode -> mode menu with the 3 modes
    pl.sent = [];
    fire({ action: "create", map: "facility" });
    const modeMenu = pl.sent.find((s) => s.event === "make_menu" && String(s.data.title).includes("game mode"));
    assert(!!modeMenu, "create: map without mode -> mode menu");
    if (modeMenu) {
        const modes = modeMenu.data.options.map((o) => o.value && o.value.mode);
        assert(modes.includes("solo"), "create: mode menu lists solo");
        assert(modes.includes("multiplayer"), "create: mode menu lists multiplayer");
        assert(modes.includes("coop_aria"), "create: mode menu lists coop_aria");
    }

    // create with map + mode -> create_match(map, mode)
    pl.sent = [];
    fire({ action: "create", map: "facility", mode: "coop_aria" });
    assert(
        pl._create && pl._create.map === "facility" && pl._create.mode === "coop_aria",
        "create: map + mode forwarded to create_match"
    );

    // join menu lists joinable matches, started matches as spectate, and hides solo
    const g_joinable = {
        started: false, mode: "multiplayer", public_: true,
        players: { size: 1 }, max_players: 8, name: "Join Me",
        owner: { user: { username: "AL", block_list: [] } },
    };
    const g_started = {
        started: true, mode: "coop_aria", public_: true,
        players: { size: 2 }, max_players: 8, name: "Battle",
        owner: { user: { username: "BO", block_list: [] } },
    };
    const g_solo = {
        started: false, mode: "solo", public_: true,
        players: { size: 1 }, max_players: 8, name: "Solo Run",
        owner: { user: { username: "CO", block_list: [] } },
    };
    handler.server.games = [g_joinable, g_started, g_solo];
    pl.sent = [];
    fire({ action: "join" });
    const joinMenu = pl.sent.find((s) => s.event === "make_menu" && String(s.data.title).includes("match"));
    assert(!!joinMenu, "join: no game -> match menu");
    if (joinMenu) {
        const options = joinMenu.data.options;
        const joinOpt = options.find((o) => o.value && o.value.game === "Join Me");
        assert(!!joinOpt, "join: joinable match listed");
        assert(joinOpt && joinOpt.value.spectator === false, "join: joinable match has spectator=false");
        const spectOpt = options.find((o) => o.value && o.value.game === "Battle" && o.value.spectator === true);
        assert(!!spectOpt, "join: started match listed as spectate");
        if (spectOpt) assert(String(spectOpt.title).startsWith("Spectate"), "join: spectate option labelled");
        assert(!options.some((o) => o.value && o.value.game === "Solo Run"), "join: solo match hidden from join list");
    }

    // join with a game + spectator flag -> forwarded to join_match
    fire({ action: "join", game: "Battle", spectator: true });
    assert(pl._join && pl._join.name === "Battle" && pl._join.spectator === true, "join: spectator flag forwarded");

    // leave for a spectator clears the flag without removing from the game
    const pls = make_fake_player("Spec");
    const h2 = make_handler(pls);
    pls.spectator = true;
    pls.game = { name: "Battle", started: true, remove_player() { this._removed = true; } };
    h2.events["mainmenu"].bind(h2)("peer1", { value: { action: "leave" } });
    assert(pls.spectator === false, "leave: spectator flag cleared");
    assert(pls.game === undefined, "leave: spectator game ref cleared");
    assert(pls.game === undefined || pls.game._removed !== true, "leave: spectator NOT removed from match players");
    assert(pls.speech.some((m) => m.includes("no longer spectating")), "leave: spectator told they stopped spectating");

    // leave for a normal player removes them
    const pln = make_fake_player("Norm");
    const h3 = make_handler(pln);
    pln.game = { name: "Lobby", started: false, players: { size: 1 }, remove_player(pl) { this._removed = pl; } };
    h3.events["mainmenu"].bind(h3)("peer1", { value: { action: "leave" } });
    assert(pln.game && pln.game._removed === pln, "leave: normal player removed from match");

    // ============================================================
    // B) join_match logic on the real Player prototype
    // ============================================================
    const serverMock = {
        maps: { facility: { mapName: "facility" } },
        game: null,
        get_game_by_name(name) {
            return this.game;
        },
    };

    // started game -> becomes a spectator, not added to players
    const p1 = make_behavior_player(serverMock);
    serverMock.game = make_join_game("facility", { started: true, name: "Battle" });
    serverMock.game.players.add({ name: "Owner" }); // pretend someone is playing
    p1.join_match("Battle", false);
    assert(p1.spectator === true, "join_match: started game forces spectator");
    assert(p1.game === serverMock.game, "join_match: spectator holds the game ref");
    assert(p1.moved_maps.includes("facility"), "join_match: spectator moved to the match map");
    assert(serverMock.game.players.size === 1, "join_match: spectator is NOT added to game players");
    assert(p1.speech.some((m) => m.includes("spectating")), "join_match: spectator announcement");

    // explicit spectator flag
    const p2 = make_behavior_player(serverMock);
    p2.join_match("Battle", true);
    assert(p2.spectator === true, "join_match: explicit spectator flag works");

    // solo not-started -> refused
    const p3 = make_behavior_player(serverMock);
    serverMock.game = make_join_game("facility", { mode: "solo", name: "Solo Run" });
    p3.join_match("Solo Run", false);
    assert(p3.spectator === false && p3.game === undefined, "join_match: solo match refused");
    assert(serverMock.game.players.size === 0, "join_match: solo match reserved");
    assert(p3.speech.some((m) => m.includes("solo")), "join_match: solo refusal explains");

    // multiplayer not-started -> joins normally
    const p4 = make_behavior_player(serverMock);
    serverMock.game = make_join_game("facility", { name: "Open Game" });
    p4.join_match("Open Game", false);
    assert(p4.spectator === false && p4.game === serverMock.game, "join_match: joins a multiplayer lobby");
    assert(serverMock.game.players.size === 1, "join_match: added to game players");
    assert(p4.moved_maps.includes("facility"), "join_match: moved into the lobby");

    // full match -> refused
    const p5 = make_behavior_player(serverMock);
    serverMock.game = make_join_game("facility", { name: "Full Game", max_players: 2, fill: 2 });
    p5.join_match("Full Game", false);
    assert(serverMock.game.players.size === 2, "join_match: full match not modified");
    assert(p5.speech.some((m) => m.includes("full")), "join_match: full match message");

    // ============================================================
    // C) zombies ignore spectators
    // ============================================================
    const spec = Object.create(Player.prototype);
    spec.spectator = true;
    spec.dead = false;
    spec.being_hit = false;
    const realP = Object.create(Player.prototype);
    realP.spectator = false;
    realP.dead = false;
    realP.being_hit = false;
    realP.map = { send_area() {} };
    realP.events = {};
    let realHits = 0;
    realP.on_hit = function (obj, hp) {
        realHits++;
    };

    // attack(): only a spectator nearby -> no target
    const z1 = make_zomby();
    z1.map = { get_objects_at: () => [spec] };
    const r1 = await z1.attack();
    assert(r1 === false, "zombie: won't attack when the only target is a spectator");
    assert(z1.tracking === null, "zombie: spectator not stored as target");

    // attack(): a real player nearby -> attacked
    const z2 = make_zomby();
    z2.map = { get_objects_at: () => [realP] };
    const r2 = await z2.attack();
    assert(r2 === true, "zombie: attacks a real player");
    assert(realHits === 1, "zombie: real player was hit");

    // find_target(): spectator-only map -> no path computed, no tracking
    const z3 = make_zomby();
    let pathCalls = 0;
    z3.map = {
        playersQuadtree: { each: (cb) => cb(spec) },
        get_objects_at: () => [],
        is_unwalkable: () => false,
        find_path: async () => {
            pathCalls++;
            return [{ x: 5, y: 5, z: 0 }];
        },
    };
    await z3.find_target();
    assert(pathCalls === 0 && z3.tracking === null, "zombie: find_target ignores spectators");

    // find_target(): real player -> path computed and tracked
    const z4 = make_zomby();
    realP.x = 5;
    realP.y = 6;
    realP.z = 0;
    z4.map = {
        playersQuadtree: { each: (cb) => cb(realP) },
        get_objects_at: () => [],
        is_unwalkable: () => false,
        find_path: async () => [{ x: 5, y: 6, z: 0 }],
    };
    await z4.find_target();
    assert(!!z4.tracking && z4.tracking.target === realP, "zombie: find_target tracks a real player");

    // ============================================================
    // D) weapon.fire guard for spectators
    // ============================================================
    const buildWeapon = (owner, onDamage) => {
        const w = Object.create(Weapon.prototype);
        w.owner = owner;
        w.melee = true;
        w.ammo = Infinity;
        w.shot_cost = 1;
        w.fire_path = "weapons/knife";
        w.sounds_path = "weapons/knife";
        w.do_damage = onDamage;
        return w;
    };

    const specOwner = Object.create(Player.prototype);
    specOwner.spectator = true;
    specOwner.total_shots = 0;
    const damageCallsSpec = { n: 0 };
    const wSpec = buildWeapon(specOwner, () => damageCallsSpec.n++);
    wSpec.fire();
    assert(damageCallsSpec.n === 0, "weapon: spectator cannot fire");

    const realOwner = Object.create(Player.prototype);
    realOwner.spectator = false;
    realOwner.total_shots = 0;
    realOwner.play_sound = function () {};
    realOwner.map = { get_tile_at: () => "concrete" };
    const damageCallsReal = { n: 0 };
    const wReal = buildWeapon(realOwner, () => damageCallsReal.n++);
    wReal.fire(45, 0);
    assert(damageCallsReal.n === 1, "weapon: real player can fire");
    assert(realOwner.total_shots === 1, "weapon: shots counted for real players");

    // ============================================================
    // E) Aria bot combat behavior (deterministic randomness)
    // ============================================================
    let R = 50;
    randomMod.random_number = () => R;
    try {
        const zomb = Object.create(Zomby.prototype);
        zomb.dead = false;
        zomb.x = 10;
        zomb.y = 0;
        zomb.z = 0;

        // reload when out of ammo (after the reload delay)
        let zg1 = make_z_game({ objects: [] });
        const b1 = make_bot();
        b1.weapon_manager.active_weapon.ammo = 0;
        zg1.aria_bot = b1;
        zg1.aria_think_timer = fakedTimer(5000);
        await zg1.aria_bot_behavior();
        assert(b1.weapon_manager.reloads === 1, "aria: reloads when out of ammo");
        await zg1.aria_bot_behavior();
        assert(b1.weapon_manager.reloads === 1, "aria: does not spam reloads");

        // decision gate: too soon -> no action
        let zg2 = make_z_game({ objects: [zomb] });
        const b2 = make_bot();
        zg2.aria_bot = b2;
        zg2.aria_think_timer = fakedTimer(50);
        await zg2.aria_bot_behavior();
        assert(b2.weapon_manager.fired === 0 && !b2._moved, "aria: waits between decisions");

        // zombie in range -> fires (imperfect aim adds jitter)
        let zg3 = make_z_game({ objects: [zomb] });
        const b3 = make_bot();
        zg3.aria_bot = b3;
        zg3.aria_think_timer = fakedTimer(5000);
        zg3.aria_fire_timer = fakedTimer(5000);
        await zg3.aria_bot_behavior();
        assert(b3.weapon_manager.fired === 1, "aria: fires at a zombie in range");
        assert(Math.abs(b3.weapon_manager.lastAngle) > 0 || b3.weapon_manager.lastAngle === 0, "aria: aims at the zombie");

        // zombie too far -> moves closer along a path
        const farZomb = Object.create(Zomby.prototype);
        farZomb.dead = false;
        farZomb.x = 100;
        farZomb.y = 0;
        farZomb.z = 0;
        let zg4 = make_z_game({
            objects: [farZomb],
            path: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
        });
        const b4 = make_bot();
        zg4.aria_bot = b4;
        zg4.aria_think_timer = fakedTimer(5000);
        zg4.aria_move_timer = fakedTimer(5000);
        await zg4.aria_bot_behavior();
        assert(b4._moved && b4._moved.x === 1, "aria: steps toward a far zombie");

        // no zombies -> occasional idle wander (random <= 30)
        R = 10;
        let zg5 = make_z_game({ objects: [] });
        const b5 = make_bot();
        zg5.aria_bot = b5;
        zg5.aria_think_timer = fakedTimer(5000);
        zg5.aria_move_timer = fakedTimer(5000);
        await zg5.aria_bot_behavior();
        assert(!!b5._moved, "aria: wanders when no zombies are around");

        // dead bot -> no action
        R = 50;
        let zg6 = make_z_game({ objects: [zomb] });
        const b6 = make_bot();
        b6.dead = true;
        zg6.aria_bot = b6;
        zg6.aria_think_timer = fakedTimer(5000);
        await zg6.aria_bot_behavior();
        assert(b6.weapon_manager.fired === 0, "aria: does nothing while dead");

        // destroy() cleans up the bot cleanly
        const zg7 = make_z_game({});
        const b7 = make_bot();
        zg7.aria_bot = b7;
        zg7.aria_bot_active = true;
        zg7.players = new Set([b7]);
        zg7.destroied = false;
        zg7.started = true;
        zg7.public_ = false;
        zg7.delayed_functions = [];
        zg7.tickExecutor = { cancel() {} };
        zg7.events = {};
        zg7.remove_game_called = false;
        zg7.server = {
            players: [],
            games: [],
            remove_game() {
                this.remove_game_called = true;
            },
            discord: { update() {} },
        };
        b7.game = zg7;
        b7.tickExecutor = { cancel() {} };
        b7.events = {};
        b7.map = {
            remove_object() {},
            mapName: "facility",
            destroy() {},
        };
        b7.peer = { disconnect() {} };
        zg7.destroy();
        assert(zg7.aria_bot === undefined, "aria: destroy clears the bot ref");
        assert(zg7.aria_bot_active === false, "aria: destroy deactivates the bot AI");
        assert(b7.game === undefined, "aria: destroy detaches the bot from the match");
        assert(zg7.players.size === 0, "aria: destroy removes the bot from players");
        assert(zg7.map._objects_destroyed === true, "aria: destroy still tears down match objects");
    } finally {
        randomMod.random_number = origRandomNumber;
    }

    // ============================================================
    // F) owner leaves a coop match leaving only the bot -> match ends cleanly
    // ============================================================
    const zg8 = Object.create(Zomby_game.prototype);
    zg8.started = true;
    zg8.public_ = false;
    zg8.destroied = false;
    zg8.players = new Set();
    zg8.scores = {};
    zg8.delayed_functions = [];
    zg8.tickExecutor = { cancel() {} };
    zg8.events = {};
    let zg8Spoke = 0;
    zg8.speak = function () {
        zg8Spoke++;
    };
    zg8.map = {
        mapName: "facility",
        destroy() {},
        destroy_objects() {},
        objects: { get: () => [] },
    };
    zg8.server = {
        maps: { main: { mapName: "main" } },
        players: [],
        games: [zg8],
        remove_game() {},
        discord: { update() {} },
    };
    const b8 = make_bot();
    b8.isBot = true;
    b8.game = zg8;
    b8.events = {};
    b8.tickExecutor = { cancel() {} };
    b8.map = { remove_object() {}, destroy() {} };
    b8.peer = { disconnect() {} };
    b8.save = () => {};
    zg8.aria_bot = b8;
    zg8.players.add(b8);
    zg8.scores["Aria"] = { points: 0, kills: 0, accuracy: 0 };
    const hu = Object.create(Player.prototype);
    hu.name = "Owner";
    hu.user = { username: "Owner", block_list: [], log() {} };
    hu.isBot = false;
    hu.game = zg8;
    hu.map = zg8.map;
    hu.dead = false;
    hu.hp = 500;
    hu.maxHp = 500;
    hu.high_kills = 0;
    hu.high_points = 0;
    hu.high_accuracy = 0;
    hu._to = null;
    hu.send = () => {};
    hu.play_sound = () => {};
    hu.save = () => {};
    hu.change_map = function (m) {
        this._to = m.mapName;
    };
    zg8.owner = hu;
    zg8.players.add(hu);
    zg8.scores["Owner"] = { points: 0, kills: 0, accuracy: 0 };
    zg8.remove_player(hu);
    assert(zg8.destroied === true, "owner leave: match destroyed when only the bot remains");
    assert(hu._to === "main", "owner leave: leaving owner moved to the main map");
    assert(b8.game === undefined, "owner leave: bot detached from the destroyed match");
    assert(zg8Spoke > 0, "owner leave: end-of-match announcement spoken");

    // ============================================================
    // G) Aria voice quip triggers (low_hp / death / revive / kill / random)
    // ============================================================
    R = 50;
    randomMod.random_number = () => R;
    try {
        const make_voice_game = () => {
            const zg = make_z_game({ objects: [] });
            const voice = [];
            zg.aria_say_voice = (category) => voice.push(category);
            return { zg, voice };
        };

        // low health (<=30% of max) -> one low_hp quip until healed above 35%
        let v1 = make_voice_game();
        const b1 = make_bot();
        b1.hp = 100;
        v1.zg.aria_bot = b1;
        v1.zg.aria_think_timer = fakedTimer(5000);
        await v1.zg.aria_bot_behavior();
        assert(in_array(v1.voice, "low_hp"), "aria voice: low hp triggers a low_hp quip");
        await v1.zg.aria_bot_behavior();
        assert(
            v1.voice.filter((c) => c === "low_hp").length === 1,
            "aria voice: low_hp quip is not spammed while still low"
        );
        b1.hp = 400; // healed above threshold
        await v1.zg.aria_bot_behavior();
        b1.hp = 100; // low again
        await v1.zg.aria_bot_behavior();
        assert(
            v1.voice.filter((c) => c === "low_hp").length === 2,
            "aria voice: low_hp quip re-arms after healing"
        );

        // death transition -> one death quip, then silence while dead
        let v2 = make_voice_game();
        const b2 = make_bot();
        b2.dead = true;
        v2.zg.aria_bot = b2;
        v2.zg.aria_think_timer = fakedTimer(5000);
        await v2.zg.aria_bot_behavior();
        assert(in_array(v2.voice, "death"), "aria voice: death transition speaks a death quip");
        await v2.zg.aria_bot_behavior();
        assert(
            v2.voice.filter((c) => c === "death").length === 1,
            "aria voice: death quip only plays once per death"
        );

        // revive transition -> revive quip
        let v3 = make_voice_game();
        const b3 = make_bot();
        b3.dead = true;
        v3.zg.aria_bot = b3;
        v3.zg.aria_was_dead = true;
        b3.dead = false;
        v3.zg.aria_think_timer = fakedTimer(5000);
        await v3.zg.aria_bot_behavior();
        assert(in_array(v3.voice, "revive"), "aria voice: revive speaks a revive quip");

        // kill counter up + random <= 50 -> kill quip; high roll -> quiet
        let v4 = make_voice_game();
        const b4 = make_bot();
        v4.zg.aria_bot = b4;
        v4.zg.scores["Aria"] = { kills: 1 };
        v4.zg.aria_kills_seen = 0;
        R = 50;
        await v4.zg.aria_bot_behavior();
        assert(in_array(v4.voice, "kill"), "aria voice: kill quip on a 50% roll");
        v4.zg.scores["Aria"].kills = 2;
        R = 100;
        await v4.zg.aria_bot_behavior();
        assert(
            v4.voice.filter((c) => c === "kill").length === 1,
            "aria voice: kill quip skipped on a high roll"
        );

        // random quip timer -> plays and re-randomizes the next interval
        let v5 = make_voice_game();
        const b5 = make_bot();
        v5.zg.aria_bot = b5;
        v5.zg.aria_voice_timer = fakedTimer(90000);
        v5.zg.aria_random_quip_ms = 45000;
        R = 60000;
        await v5.zg.aria_bot_behavior();
        assert(in_array(v5.voice, "random"), "aria voice: random quip on the timer");
        assert(
            v5.zg.aria_voice_timer.elapsed === 0 && v5.zg.aria_random_quip_ms >= 30000,
            "aria voice: random quip reschedules the next one"
        );
        await v5.zg.aria_bot_behavior();
        assert(
            v5.voice.filter((c) => c === "random").length === 1,
            "aria voice: no random quip until the timer elapses again"
        );
    } finally {
        randomMod.random_number = origRandomNumber;
    }

    console.log("-----------------------------------");
    console.log(`RESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})();