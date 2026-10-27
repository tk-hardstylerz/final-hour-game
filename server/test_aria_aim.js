process.env.FH_NO_DISCORD = "1";
const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));
const movement = require(path.join(__dirname, "dist", "libs", "movement.js"));
const Player = D("objects/player.js").default;
const Zomby = D("objects/zomby.js").default;
const Weapon = D("weapon.js").default;
const Zomby_game = D("zomby_game.js").default;

function makeZombie(x, y) {
    const z = Object.create(Zomby.prototype);
    z.dead = false;
    z.x = x;
    z.y = y;
    z.z = 0;
    z.hp = 100;
    z.play_sound = function () {};
    z.on_hit = function (owner, dmg) {
        this.hp -= dmg;
        this._hit = true;
    };
    return z;
}

function makeBot(map) {
    const p = Object.create(Player.prototype);
    p.name = "Aria";
    p.dead = false;
    p.spectator = false;
    p.x = 0;
    p.y = 0;
    p.z = 0;
    p.total_shots = 0;
    p.total_hits = 0;
    p.play_sound = function () {};
    p.map = map;
    const w = new Weapon({
        server: {},
        owner: p,
        name: "mp7",
        melee: false,
        fire_time: 100,
        automatic: true,
        shot_cost: 1,
        max_ammo: 40,
        ammo: 40,
        reserved_ammo: 200,
        range: 24,
        damage: 30,
    });
    p.weapon_manager = {
        active_weapon: w,
        weapons: [w],
        fire(angle, pitch) {
            this.active_weapon.fire(angle, pitch);
        },
        switch_weapon() {},
        reload() {},
    };
    return p;
}

function makeGame(bot, zombies) {
    const zg = Object.create(Zomby_game.prototype);
    zg.map = {
        objects: { get: () => zombies },
        get_objects_at(box) {
            const bx = Math.trunc(box.x), by = Math.trunc(box.y);
            return zombies.filter(
                (z) => !z.dead && Math.trunc(z.x) === bx && Math.trunc(z.y) === by
            );
        },
        get_tile_at() {
            return "floor";
        },
        is_unwalkable: () => false,
        find_path: async () => null,
        play_unbound() {},
    };
    zg.aria_bot = bot;
    if (bot) bot.game = zg;
    return zg;
}

const cases = [
    ["este (10,0)", 10, 0],
    ["oeste (-10,0)", -10, 0],
    ["norte (0,10)", 0, 10],
    ["sur (0,-10)", 0, -10],
    ["noreste (7,7)", 7, 7],
    ["suroeste (-6,8)", -6, 8],
];

let allHit = true;
for (const [label, tx, ty] of cases) {
    const z = makeZombie(tx, ty);
    const bot = makeBot(makeGame(null, [z]).map);
    const zg = makeGame(bot, [z]);
    zg.aria_fire_at(z);
    const hit = z._hit === true;
    if (!hit) allHit = false;
    console.log(`${label}: hp 100=>${Math.round(z.hp)} ${hit ? "HIT" : "MISS"}`);
}

// LOS: pared al este entre bot y zombie -> no debe haber linea de fuego
const wallZ = makeZombie(10, 0);
const bot2 = makeBot(null);
const tiles = new Set(["4,0", "5,0", "6,0"]);
const zg2 = makeGame(bot2, [wallZ]);
zg2.map.get_tile_at = (x, y) => (tiles.has(`${x},${y}`) ? "wall_stone" : "floor");
bot2.map = zg2.map;
console.log(`LOS con pared en medio: ${zg2.aria_line_of_fire(wallZ) ? "LIBRE (mal)" : "BLOQUEADA (correcto)"}`);
const clearZ = makeZombie(0, 10);
console.log(`LOS despejada al norte: ${zg2.aria_line_of_fire(clearZ) ? "LIBRE (correcto)" : "BLOQUEADA (mal)"}`);

console.log(allHit ? "TODAS LAS DIRECCIONES ACIERTAN" : "HAY FALLOS");
