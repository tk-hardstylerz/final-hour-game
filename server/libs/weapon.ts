import * as random from "./random";
import * as movement from "./movement";
import Server from "./networking";
import Entity from "./objects/entity";
import Window from "./objects/window";
import Player from "./objects/player";
import Zomby from "./objects/zomby";
import Hellhound from "./objects/hellhound";
export default class Weapon {
    server: Server;
    owner: Entity;
    melee: boolean;
    sounds_path: string;
    name: string;
    fire_path: string;
    dry_fire_path: string;
    impact_path: string;
    reload_path: string;
    speed_reload_path: string;
    fire_time: number;
    reload_time: number;
    automatic: boolean;
    shot_cost: number;
    max_ammo: number;
    max_reserved_ammo: number;
    ammo: number;
    reserved_ammo: number;
    range: number;
    upgraded: boolean;
    recoil_chance: number;
    damage: number;
    constructor({
        server,
        owner,
        name,
        melee = false,
        sounds_path = "",
        fire_time = 1000,
        reload_time = 1000,
        automatic = false,
        shot_cost = 1,
        max_ammo = 10,
        max_reserved_ammo = 10,
        ammo = 10,
        reserved_ammo = 10,
        range = 10,
        upgraded = false,
        recoil_chance = 0,
        damage = 10,
    }: {
        server: Server;
        owner: Entity;
        name: string;
        melee?: boolean;
        sounds_path?: string;
        fire_time?: number;
        reload_time?: number;
        automatic?: boolean;
        shot_cost?: number;
        max_ammo?: number;
        max_reserved_ammo?: number;
        ammo?: number;
        reserved_ammo?: number;
        range?: number;
        upgraded?: boolean;
        recoil_chance?: number;
        damage?: number;
    }) {
        this.server = server;
        this.owner = owner;
        this.melee = melee;
        this.sounds_path = sounds_path;
        this.name = name;
        this.fire_path = `${sounds_path}/fire`;
        this.dry_fire_path = `${sounds_path}/dry`;
        this.impact_path = `${sounds_path}/impact`;
        this.reload_path = `${sounds_path}/reload`;
        this.speed_reload_path = `${sounds_path}/speed_reload`;
        this.fire_time = fire_time;
        this.reload_time = reload_time;
        this.automatic = automatic;
        this.shot_cost = shot_cost;
        this.max_ammo = max_ammo;
        this.max_reserved_ammo = max_reserved_ammo;
        this.ammo = ammo;
        this.reserved_ammo = reserved_ammo;
        this.range = range;
        this.upgraded = upgraded;
        this.recoil_chance = recoil_chance;
        this.damage = damage;
    }
    get_data() {
        return {
            melee: this.melee,
            name: this.name,
            sounds_path: this.sounds_path,
            fire_time: this.fire_time,
            reload_time: this.reload_time,
            automatic: this.automatic,
            shot_cost: this.shot_cost,
            max_ammo: this.max_ammo,
            max_reserved_ammo: this.max_reserved_ammo,
            ammo: this.ammo,
            reserved_ammo: this.reserved_ammo,
            recoil_chance: this.recoil_chance,
        };
    }
    fire(angle = 0, pitch = 0) {
        if (this.owner instanceof Player && this.owner.spectator) return;
        if (this.melee || this.ammo >= this.shot_cost) {
            this.owner.play_sound(
                this.fire_path + "/",
                false,
                100,
                false,
                true,
                true,
                "",
                `${this.sounds_path}/dist/`
            );
            this.ammo -= this.shot_cost;
            this.do_damage(angle, pitch);
            if (this.owner instanceof Player) {
                this.owner.total_shots += 1;
                this.owner.accuracy = Math.round(
                    (this.owner.total_hits / this.owner.total_shots) * 100
                );
            }
            if (this.melee == false) {
                this.owner.play_sound(
                    `weapons/shell/${this.owner.map.get_tile_at(
                        this.owner.x,
                        this.owner.y,
                        this.owner.z
                    )}/`,
                    false,
                    20,
                    false,
                    true,
                    true
                );
            }
        }
    }
    reload() {
        if (!this.melee && this.ammo <= 0 && this.reserved_ammo) {
            let reload_path = this.reload_path;
            if (this.owner instanceof Player && this.owner.speed_cola == true) reload_path = this.speed_reload_path;
            this.owner.play_sound(
                reload_path + "/",
                false,
                100,
                false,
                true
            );
            if (this.reserved_ammo >= this.max_ammo) {
                this.ammo = this.max_ammo;
                this.reserved_ammo -= this.max_ammo;
            } else {
                this.ammo += this.reserved_ammo;
                this.reserved_ammo = 0;
            }
        }
    }
    do_damage(angle = 0, pitch = 0) {
        let x = this.owner.x;
        let y = this.owner.y;
        let z = this.owner.z;
        for (let index = 0; index < this.range; index++) {
            const truncatedX = Math.trunc(x);
            const truncatedY = Math.trunc(y);
            const truncatedZ = Math.trunc(z);
            const targets = this.owner.map.get_objects_at(
                {
                    x: truncatedX,
                    y: truncatedY,
                    z: truncatedZ,
                    height: 1,
                    width: 1,
                    max_z: truncatedZ + 0.9999,
                },
                false,
                true
            );
            for (const target of targets) {
                if (!target.dead && target != this.owner) 
                if (target instanceof Zomby || target instanceof Hellhound) {
                    target.play_sound(this.impact_path);
                    target.on_hit(
                        this.owner,
                        this.damage * random.random_number(0.8, 1.5, 2)
                    );
                    if (this.owner instanceof Player)
                        this.owner.total_hits += 1;
                    return;
                }
            }
            const distTile = this.owner.map.get_tile_at(truncatedX, truncatedY, truncatedZ);
            if (distTile.startsWith("wall")) {
                if (!this.melee) {
                    this.owner.map.play_unbound(
                        `foley/bullet_impacts/${distTile}`,
                        x,
                        y,
                        z
                    );
                }
                break;
            }
            const dist = movement.move([x, y, z], angle, pitch, 1);
            [x, y, z] = [dist.x, dist.y, dist.z];
        }
    }
}
