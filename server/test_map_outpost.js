process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

const WorldMap = D("world_map/index.js").default;
const Zomby_game = D("zomby_game.js").default;
const Player = D("objects/player.js").default;
const Zomby = D("objects/zomby.js").default;
const Weapon = D("weapon.js").default;
const Zone = D("world_map/elements/zone.js").default;
const DoorObj = D("world_map/elements/door.js").default;

function loadWeaponData() {
    const dir = path.join(__dirname, "weapons");
    const data = {};
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".json"))
            data[f.replace(".json", "")] = JSON.parse(
                fs.readFileSync(path.join(dir, f), "utf8")
            );
    }
    return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

(async () => {
    let idc = 0;
    const weapon_data = loadWeaponData();
    const server = new (require("events").EventEmitter)();
    Object.assign(server, {
        players: [],
        games: [],
        language_channels: { english: { add_player() {}, remove_player() {}, send() {} } },
        weapon_data,
        make_weapon({ owner, name, upgraded = false }) {
            const data = upgraded ? weapon_data[name].upgrade : weapon_data[name];
            return new Weapon({
                server: this,
                owner,
                name: data.name ?? name,
                ammo: data.max_loaded_ammo ?? 0,
                max_ammo: data.max_loaded_ammo ?? 0,
                reserved_ammo: data.max_reserve_ammo ?? 0,
                max_reserved_ammo: data.max_reserve_ammo ?? 0,
                automatic: data.fully_automatic ?? false,
                melee: data.melee ?? false,
                range: data.range ?? 1,
                damage: data.damage ?? 10,
                fire_time: 1000 / (data.bullets_per_second ?? 1),
            });
        },
        get_available_voice_channel() { return 1; },
        get_id() { return ++idc; },
        sleep_for: (ms) => new Promise((r) => setTimeout(r, ms)),
        system_log: () => {},
        send() {},
        send_all() {},
        add_game() {},
        remove_game() {},
        remove_player() {},
        get_by_peer() { return undefined; },
        discord: { update() {}, send_message() {} },
        speakmods() {},
        speakbuilders() {},
        maps: {},
    });

    const map = await WorldMap.compileMapFromFile(server, "maps/outpost.map");
    server.maps.outpost = map;
    server.maps.main = map;

    // tiles
    assert(map.get_tile_at(0, 0, 0) === "concrete", "tile: courtyard ground");
    assert(map.get_tile_at(-20, -20, 0) === "carpet", "tile: bunker floor");
    assert(map.get_tile_at(22, 20, 0) === "metal", "tile: armory floor");
    assert(map.get_tile_at(-15, -19, 0) === "wallwood", "bunker door closed blocks");
    assert(map.get_tile_at(15, 23, 0) === "wallconcrete", "armory door closed blocks");
    assert(map.get_tile_at(-24, -15, 0) === "air", "bunker window intact blocks");
    assert(map.get_tile_at(24, 13, 0) === "air", "armory window intact blocks");
    assert(map.get_tile_at(31, 0, 0) === "wallconcrete", "east perimeter wall");
    assert(map.get_tile_at(0, 31, 0) === "wallconcrete", "north perimeter wall");
    assert(map.get_tile_at(-20, -20, 10) === "concrete", "bunker ceiling");

    // player spawn inside the bunker
    const ps = map.get_player_spawn();
    assert(
        ps.x >= -29 && ps.x <= -16 && ps.y >= -30 && ps.y <= -16 && ps.z === 0,
        `player spawn inside bunker (${ps.x},${ps.y},${ps.z})`
    );

    // path blocked with door closed, open with door opened
    let p = await map.find_path(-23, -23, 0, 0, -5, 0);
    assert(!p || p.length === 0, "no path from bunker to yard while door closed");
    const bunkerDoor = map.doors.find((d) => d.minpoints === 750);
    assert(!!bunkerDoor, "bunker door exists");
    bunkerDoor.switch_state(true, false);
    assert(
        !map.get_tile_at(-15, -19, 0).includes("wall"),
        "bunker door open is walkable"
    );
    p = await map.find_path(-23, -23, 0, 0, -5, 0);
    assert(Array.isArray(p) && p.length > 0, "path from bunker to yard once door opens");

    // window break opens a passage
    const WindowObject = D("objects/window.js").default;
    let bunkerWindow = null;
    map.objects.each((o) => {
        if (o instanceof WindowObject && o.x === -24 && o.y === -15)
            bunkerWindow = o;
    });
    assert(!!bunkerWindow, "bunker window entity exists");
    bunkerWindow.break();
    assert(map.get_tile_at(-24, -15, 0) === "window", "broken window tile is walkable");

    // zones (last matching wins)
    function zoneAt(x, y, z) {
        let text = "";
        for (const el of map.allElements) {
            if (el instanceof Zone && el.in_bound(x, y, z)) text = el.text;
        }
        return text;
    }
    assert(zoneAt(-20, -20, 0) === "the spawn bunker", "zone: bunker");
    assert(zoneAt(0, 20, 0) === "the north yard", "zone: north yard");
    assert(zoneAt(20, 20, 0) === "the armory", "zone: armory");
    assert(zoneAt(0, 4, 0) === "the power generator", "zone: generator");

    // elements present
    assert(map.wallbuys.length === 7, `wallbuys: ${map.wallbuys.length}/7`);
    assert(map.doors.length === 2, `doors: ${map.doors.length}/2`);
    assert(map.zomby_spawns.length === 7, `zombie spawns: ${map.zomby_spawns.length}/7`);
    assert(map.playerSpawns.length === 1, "one player spawn zone");
    assert(map.get_zomby_spawn().z === 0, "zombie spawn returns a ground point");

    // ---- live match simulation: Aria vs the horde on outpost ----
    const owner = new Player({
        server,
        peer: { send() {}, disconnect() {} },
        user: {
            username: "Tester",
            muted: false,
            moderator: true,
            builder: true,
            contributor: true,
            block_list: [],
            save: async () => {},
            log() {},
        },
        map,
        hp: 100,
    });
    server.players.push(owner);
    const zg = new Zomby_game(server, owner, "OutpostMatch", map, 4, true);
    zg.mode = "coop_aria";
    zg.aria_say_voice = () => {};
    zg.spawn_aria_bot();
    zg.started = true;
    const bot = zg.aria_bot;
    console.log(`bot spawn: (${bot.x}, ${bot.y}, ${bot.z})`);

    const zombies = [];
    for (const spawn of map.zomby_spawns) {
        const zx = Math.round((spawn.minx + spawn.maxx) / 2);
        const zy = Math.round((spawn.miny + spawn.maxy) / 2);
        const z = new Zomby(server, map, 150, 20, zx, zy, 0);
        zombies.push(z);
    }
    // 3 extra zombies near the bunker, like a real round spawning close to the players
    for (const [zx, zy] of [[-8, -8], [0, -14], [-14, -2]]) {
        zombies.push(new Zomby(server, map, 150, 20, zx, zy, 0));
    }

    const startHp = bot.hp;
    let moves = 0;
    let lastPos = { x: bot.x, y: bot.y };
    const startDist = zombies.map((z) => Math.hypot(z.x - bot.x, z.y - bot.y));
    const t0 = Date.now();
    let error = null;
    while (Date.now() - t0 < 30000) {
        try {
            await zg.aria_bot_behavior();
        } catch (e) {
            error = e;
            break;
        }
        if (bot.x !== lastPos.x || bot.y !== lastPos.y) {
            moves++;
            lastPos = { x: bot.x, y: bot.y };
        }
        await sleep(40);
    }
    if (error) {
        console.log("FAIL: exception en aria_bot_behavior:", error);
        fail++;
    }
    let dead = 0;
    let approached = 0;
    for (let i = 0; i < zombies.length; i++) {
        const z = zombies[i];
        if (z.dead) {
            dead++;
            continue;
        }
        const d0 = startDist[i];
        const dNow = Math.hypot(z.x - bot.x, z.y - bot.y);
        if (dNow < d0 - 3) approached++;
    }
    console.log(
        `match sim: moves=${moves} kills=${dead}/${zombies.length} botHp=${Math.round(bot.hp)}/${startHp} pos=(${bot.x},${bot.y},${bot.z}) zombiesApproaching=${approached}`
    );
    assert(moves > 0, "aria moves on outpost");
    assert(bot.hp >= startHp || bot.hp > 400, "aria survives the sim");
    assert(dead >= 1, "aria kills close zombies on outpost");
    assert(approached >= 2, "distant zombies path toward the players");

    console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
    console.log("FAIL:", e);
    process.exit(1);
});
