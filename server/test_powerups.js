const Timer = require("./dist/libs/timer.js").default;
const { default: LongtimePowerup } = require("./dist/libs/powerups/long_time_powerup.js");
const { default: InstakillPowerup } = require("./dist/libs/powerups/instakill.js");
const { default: DoublePointsPowerup } = require("./dist/libs/powerups/double_points.js");
const { default: MaxAmmoPowerup } = require("./dist/libs/powerups/max_ammo.js");

class FakeWeapon {
    constructor(max_ammo, max_reserved_ammo, ammo, reserved_ammo) {
        this.max_ammo = max_ammo;
        this.max_reserved_ammo = max_reserved_ammo;
        this.ammo = ammo;
        this.reserved_ammo = reserved_ammo;
    }
}
class FakeWm {
    constructor(weapons) { this.weapons = weapons; this.modified = []; }
    modify(num, data) { this.modified.push([num, data]); Object.assign(this.weapons[num], data); }
}
class FakePlayer {
    constructor(name) {
        this.name = name;
        this.weapon_manager = new FakeWm([
            new FakeWeapon(40, 280, 0, 0),
            new FakeWeapon(6, 24, 0, 0),
        ]);
        this.sounds = [];
    }
    play_direct(...args) { this.sounds.push(args[0]); }
}
class FakeGame {
    constructor() {
        this.players = new Set();
        this.instakill = false;
        this.double_points = false;
        this.current_long_time_powerups = [];
        this.gotten_powerups = 0;
    }
    // inline copy of randomize_powerup from zomby_game.ts
    async randomize_powerup(percentage = 2, powerup_list) {
        if (this.gotten_powerups > 4) return;
        if (Math.random() * 100 <= percentage) {
            powerup_list = [...(powerup_list ?? [MaxAmmoPowerup, DoublePointsPowerup, InstakillPowerup])];
            powerup_list.sort(() => Math.random() - 0.5);
            for (let chosen_powerup_type of powerup_list) {
                const chosen_powerup = new chosen_powerup_type(this);
                if (chosen_powerup instanceof LongtimePowerup) {
                    if (this.is_longtime_powerup_active(chosen_powerup_type)) continue;
                    this.add_long_time_powerup(chosen_powerup);
                }
                chosen_powerup.activate();
                this.gotten_powerups++;
                break;
            }
        }
    }
    is_longtime_powerup_active(t) { return this.current_long_time_powerups.some(p => p instanceof t); }
    add_long_time_powerup(p) { this.current_long_time_powerups.push(p); }
    remove_long_time_powerup(p) { this.current_long_time_powerups.splice(this.current_long_time_powerups.indexOf(p), 1); }
    // inline copy of loop() powerup section from zomby_game.ts
    async powerup_update() {
        const to_remove = [];
        for (let powerup of this.current_long_time_powerups) {
            if (!powerup.is_active || powerup.active_timer.elapsed >= powerup.powerup_time) {
                await powerup.deactivate();
                to_remove.push(powerup);
            }
        }
        to_remove.forEach(this.remove_long_time_powerup, this);
    }
}

async function main() {
    const game = new FakeGame();
    const p = new FakePlayer("tester");
    game.players.add(p);

    console.log("== randomize_powerup(100) with shuffled list ==");
    for (let i = 0; i < 10; i++) {
        game.gotten_powerups = 0;
        game.current_long_time_powerups = [];
        await game.randomize_powerup(100);
        const active = game.current_long_time_powerups.map(x => x.constructor.name);
        console.log(`iter ${i}: picked=${active.join(",") || "(none/nuke)"} sounds=${p.sounds}`);
    }

    console.log("\n== Direct activation of each ==");
    game.gotten_powerups = 0; game.current_long_time_powerups = [];
    const maxAmmo = new MaxAmmoPowerup(game);
    await maxAmmo.activate();
    console.log("max ammo -> weapons:", p.weapon_manager.weapons.map(w => `${w.ammo}/${w.reserved_ammo}`));

    const insta = new InstakillPowerup(game);
    await insta.activate();
    console.log("instakill -> flag:", game.instakill, "is_active:", insta.is_active);

    const dp = new DoublePointsPowerup(game);
    await dp.activate();
    console.log("double_points -> flag:", game.double_points, "is_active:", dp.is_active);

    console.log("\n== game.powerup_update() immediately (0ms elapsed) ==");
    await game.powerup_update();
    console.log("after update -> instakill:", game.instakill, "double_points:", game.double_points, "active:", game.current_long_time_powerups.length);
}
main().catch(e => { console.error("ERROR", e); process.exit(1); });
