process.env.FH_NO_DISCORD = "1";
const path = require("path");
const fs = require("fs");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));

const WorldMap = D("world_map/index.js").default;
const Zomby_game = D("zomby_game.js").default;
const Player = D("objects/player.js").default;
const Zomby = D("objects/zomby.js").default;
const Weapon = D("weapon.js").default;

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

(async () => {
    let idc = 0;
    const weapon_data = loadWeaponData();
    const server = new (require("events").EventEmitter)();
    Object.assign(server, {
        players: [],
        games: [],
        language_channels: {
            english: { add_player() {}, remove_player() {}, send() {} },
        },
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
        get_available_voice_channel() {
            return 1;
        },
        get_id() {
            return ++idc;
        },
        sleep_for: (ms) => new Promise((r) => setTimeout(r, ms)),
        system_log: () => {},
        send() {},
        send_all() {},
        add_game() {},
        remove_game() {},
        remove_player() {},
        get_by_peer() { return undefined; },
        used_voice_channel: 20,
        discord: { update() {}, send_message() {} },
        speakmods() {},
        speakbuilders() {},
        maps: {},
    });

    const map = await WorldMap.compileMapFromFile(server, "maps/main.map");
    server.maps.main = map;
    server.maps[map.mapName] = map;

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

    const zg = new Zomby_game(server, owner, "SmokeMatch", map, 4, true);
    zg.mode = "coop_aria";
    zg.aria_say_voice = () => {};
    zg.spawn_aria_bot();
    zg.started = true;
    const bot = zg.aria_bot;
    console.log(`bot spawn: (${bot.x}, ${bot.y}, ${bot.z})`);

    function findSpotAway(x, y, z, dx, dy, want) {
        for (let d = want; d >= 2; d--) {
            const tx = Math.trunc(x + dx * d);
            const ty = Math.trunc(y + dy * d);
            const tile = map.get_tile_at(tx, ty, Math.trunc(z));
            if (!map.is_unwalkable(map, tx, ty, z) && tile && tile !== "air" && tile !== "")
                return { x: tx, y: ty };
        }
        return null;
    }

    const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [0.7, 0.7],
    ];
    const zombies = [];
    for (let i = 0; i < dirs.length; i++) {
        const spot = findSpotAway(bot.x, bot.y, bot.z, dirs[i][0], dirs[i][1], 7);
        if (!spot) continue;
        const z = new Zomby(server, map, 150, 20, spot.x, spot.y, bot.z);
        zombies.push({ z, label: `dir${i}` });
    }
    console.log(`zombies placed: ${zombies.length}`);
    if (zombies.length === 0) {
        console.log("FAIL: no se pudieron colocar zombies");
        process.exit(1);
    }

    const startHp = bot.hp;
    let moves = 0;
    let lastPos = { x: bot.x, y: bot.y };
    const dbg = process.env.DEBUG_ARIA === "1";
    if (dbg) {
        const PlayerProto = Object.getPrototypeOf(owner);
        const ZombyProto = Object.getPrototypeOf(zombies[0].z);
        const origZDestroy = ZombyProto.destroy;
        ZombyProto.destroy = function (...args) {
            console.log(
                `[dbg] Zomby.destroy name=${this.name} game=${this.game ? this.game.constructor.name + "/" + this.game.name : "none"} protoChain=${(function (o) { let n = []; while (o) { n.push(o.constructor && o.constructor.name); o = Object.getPrototypeOf(o); } return n.join(">"); })(this)}`
            );
            return origZDestroy.apply(this, args);
        };
        const origPDestroy = PlayerProto.destroy;
        PlayerProto.destroy = function (...args) {
            console.log(
                `[dbg] Player.destroy on name=${this.name} type=${this.constructor.name}\n` +
                    new Error("trace").stack
            );
            return origPDestroy.apply(this, args);
        };
        const origRemove = zg.remove_player.bind(zg);
        zg.remove_player = (p, sp, de) => {
            console.log(
                `[dbg] remove_player name=${p.name} dead=${p.dead} playersSize=${zg.players.size}\n` +
                    new Error("trace").stack
            );
            origRemove(p, sp, de);
        };
        const origDestroy = zg.destroy.bind(zg);
        zg.destroy = () => {
            console.log("[dbg] DESTROY CALLED!");
            origDestroy();
        };
        const origMoveTo = zg.aria_move_to.bind(zg);
        zg.aria_move_to = (tx, ty, tz, run) => {
            console.log(
                `[dbg] move_to ${tx},${ty},${tz} run=${run} pending=${zg.aria_path_pending} pathLen=${zg.aria_path ? zg.aria_path.length : -1}`
            );
            origMoveTo(tx, ty, tz, run);
        };
        const origFind = map.find_path.bind(map);
        map.find_path = async (...args) => {
            const r = await origFind(...args);
            console.log(
                `[dbg] find_path ${args.join(",")} -> ${r ? r.length + " puntos" : "null"}`
            );
            return r;
        };
    }
    const t0 = Date.now();
    let error = null;
    let lastDbg = 0;
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
        if (dbg && Date.now() - lastDbg > 2000) {
            lastDbg = Date.now();
            const alive = zombies.filter((q) => !q.z.dead);
            const closest = alive.length
                ? Math.round(
                      Math.min(
                          ...alive.map((q) =>
                              Math.hypot(q.z.x - bot.x, q.z.y - bot.y)
                          )
                      )
                  )
                : -1;
            console.log(
                `[dbg] t=${Math.round((Date.now() - t0) / 1000)}s pos=(${bot.x},${bot.y},${bot.z}) moves=${moves} alive=${alive.length} closest=${closest} ownerHp=${Math.round(owner.hp)} wep=${bot.weapon_manager.active_weapon ? bot.weapon_manager.active_weapon.name : "?"} ammo=${bot.weapon_manager.active_weapon ? bot.weapon_manager.active_weapon.ammo : "?"} stance=${zg.aria_stance}`
            );
        }
        await sleep(40);
    }

    if (error) {
        console.log("FAIL: exception en aria_bot_behavior:", error);
        process.exit(1);
    }
    let dead = 0;
    for (const { z, label } of zombies) {
        if (z.dead) dead++;
        console.log(`${label}: hp=${Math.round(z.hp)} dead=${z.dead}`);
    }
    console.log(
        `moves=${moves} dead=${dead}/${zombies.length} botHp=${Math.round(bot.hp)}/${startHp} pos=(${bot.x},${bot.y},${bot.z})`
    );
    const ok = moves > 0 && dead >= 2 && bot.hp >= startHp;
    console.log(ok ? "SMOKE OK" : "SMOKE FAIL");
    process.exit(ok ? 0 : 1);
})().catch((e) => {
    console.log("FAIL:", e);
    process.exit(1);
});
