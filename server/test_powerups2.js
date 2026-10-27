const { default: LongtimePowerup } = require("./dist/libs/powerups/long_time_powerup.js");
const { default: InstakillPowerup } = require("./dist/libs/powerups/instakill.js");
const { default: DoublePointsPowerup } = require("./dist/libs/powerups/double_points.js");
const { default: MaxAmmoPowerup } = require("./dist/libs/powerups/max_ammo.js");

class FakeWeapon { constructor(mA, mR, a, r) { this.max_ammo = mA; this.max_reserved_ammo = mR; this.ammo = a; this.reserved_ammo = r; } }
class FakeWm {
    constructor(weapons) { this.weapons = weapons; this.modified = []; }
    modify(num, data) { this.modified.push([num, data]); Object.assign(this.weapons[num], data); }
}
class FakePlayer {
    constructor(name) {
        this.name = name;
        this.weapon_manager = new FakeWm([new FakeWeapon(40, 280, 0, 0), new FakeWeapon(6, 24, 0, 0)]);
        this.sounds = [];
    }
    play_direct(...a) { this.sounds.push(a[0]); }
}
class FakeGame {
    constructor() {
        this.players = new Set();
        this.instakill = false;
        this.double_points = false;
        this.current_long_time_powerups = [];
        this.gotten_powerups = 0;
    }
    randomize_powerup(percentage = 2, powerup_list) {
        if (this.gotten_powerups > 4) return;
        if (Math.random() * 100 <= percentage) {
            powerup_list = [...(powerup_list ?? [MaxAmmoPowerup, DoublePointsPowerup, InstakillPowerup])];
            powerup_list.sort(() => Math.random() - 0.5);
            for (let type of powerup_list) {
                const p = new type(this);
                if (p instanceof LongtimePowerup) {
                    if (this.is_longtime_powerup_active(type)) continue;
                    this.add_long_time_powerup(p);
                }
                p.activate(); // NOT awaited, like the real code
                this.gotten_powerups++;
                break;
            }
        }
    }
    is_longtime_powerup_active(t) { return this.current_long_time_powerups.some(p => p instanceof t); }
    add_long_time_powerup(p) { this.current_long_time_powerups.push(p); }
    remove_long_time_powerup(p) { this.current_long_time_powerups.splice(this.current_long_time_powerups.indexOf(p), 1); }
    async game_loop() {
        const to_remove = [];
        for (let p of this.current_long_time_powerups) {
            if (!p.is_active || p.active_timer.elapsed >= p.powerup_time) {
                await p.deactivate();
                to_remove.push(p);
            }
        }
        to_remove.forEach(this.remove_long_time_powerup, this);
    }
}

async function main() {
    const game = new FakeGame();
    const p = new FakePlayer("tester");
    game.players.add(p);

    // Force instakill
    game.randomize_powerup(100, [InstakillPowerup]);
    await new Promise(r => setTimeout(r, 5)); // allow the un-awaited activate's microtasks
    console.log("after instakill drop:", JSON.stringify({
        flag: game.instakill,
        list: game.current_long_time_powerups.length,
        is_active: game.current_long_time_powerups[0]?.is_active,
        elapsed: game.current_long_time_powerups[0]?.active_timer.elapsed,
    }));

    // simulate game loops over 1.5s
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 25));
        await game.game_loop();
    }
    console.log("after 1.5s:", JSON.stringify({
        flag: game.instakill,
        list: game.current_long_time_powerups.length,
        is_active: game.current_long_time_powerups[0]?.is_active,
        elapsed: game.current_long_time_powerups[0]?.active_timer.elapsed,
    }));

    // Force max ammo, then fire-check
    p.weapon_manager.modified = [];
    game.randomize_powerup(100, [MaxAmmoPowerup]);
    await new Promise(r => setTimeout(r, 5));
    console.log("after max ammo:", JSON.stringify({
        modified: p.weapon_manager.modified,
        ammo: p.weapon_manager.weapons.map(w => w.ammo),
    }));
}
main().catch(e => { console.error("ERROR", e); process.exit(1); });
