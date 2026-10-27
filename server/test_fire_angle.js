process.env.FH_NO_DISCORD = "1";
const path = require("path");
const D = (p) => require(path.join(__dirname, "dist", "libs", p));
const movement = require(path.join(__dirname, "dist", "libs", "movement.js"));
const Player = D("objects/player.js").default;
const Zomby = D("objects/zomby.js").default;
const Weapon = D("weapon.js").default;

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

function makeBot() {
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
    return p;
}

function makeMap(zombie) {
    return {
        get_objects_at(box) {
            const bx = Math.trunc(box.x), by = Math.trunc(box.y);
            if (bx === Math.trunc(zombie.x) && by === Math.trunc(zombie.y)) return [zombie];
            return [];
        },
        get_tile_at() {
            return "floor";
        },
        play_unbound() {},
    };
}

function makeWeapon(owner, map, range = 24) {
    return new Weapon({
        server: {},
        owner,
        name: "mp7",
        melee: false,
        sounds_path: "weapons/mp7",
        fire_time: 100,
        reload_time: 1000,
        automatic: true,
        shot_cost: 1,
        max_ammo: 40,
        ammo: 40,
        reserved_ammo: 200,
        range,
        damage: 30,
    });
}

const cases = [
    ["este (10,0)", 10, 0],
    ["oeste (-10,0)", -10, 0],
    ["norte (0,10)", 0, 10],
    ["sur (0,-10)", 0, -10],
    ["noreste (7,7)", 7, 7],
];

for (const [label, tx, ty] of cases) {
    const zCalc = makeZombie(tx, ty);
    const bot1 = makeBot();
    bot1.map = makeMap(zCalc);
    const w1 = makeWeapon(bot1, bot1.map);
    const aCalc = movement.calculate_angle(0, tx, 0, ty, 0, 0, 0);
    w1.fire(aCalc, 0);

    const zTrue = makeZombie(tx, ty);
    const bot2 = makeBot();
    bot2.map = makeMap(zTrue);
    const w2 = makeWeapon(bot2, bot2.map);
    const aTrue = (Math.atan2(tx - 0, ty - 0) * 180 / Math.PI + 360) % 360;
    w2.fire(aTrue, 0);

    console.log(
        `${label}: calculate_angle=${aCalc} -> hp ${100}=>${zCalc.hp} ${zCalc._hit ? "HIT" : "miss"} | atan2(dx,dy)=${aTrue} -> hp 100=>${zTrue.hp} ${zTrue._hit ? "HIT" : "miss"}`
    );
}
