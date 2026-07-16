import Entity from "./entity";
import Timer from "../timer";
import consts from "../consts";
import * as movement from "../movement";
import Player from "./player";
import Server from "../networking";
import WorldMap from "../world_map";
import Game from "../game_mode";
import Game_object from "./object";
import { Point } from "../tracker";

export default class Grenade_entity extends Entity {
    owner: Player;
    range: number;
    radius: number;
    damage: number;
    fuse_time: number;
    fuse_timer: Timer;
    movement_time: number;
    should_move: boolean;
    tiles_moved: number;
    thrown: boolean;
    grenade: boolean;
    exploded: boolean;
    hittable: boolean;
    angle: number;
    pitch: number;
    on_owner_move_listener: (coords: {
        x: number;
        y: number;
        z: number;
    }) => void;
    constructor(
        server: Server,
        owner: Player,
        range = 15,
        radius = 5,
        damage = 20,
        fuse_time = 3000,
        name: string,
        map: WorldMap,
        x: number,
        y: number,
        z: number,
        game?: Game
    ) {
        super({
            server,
            map,
            name,
            x,
            y,
            z,
            hp: damage,
            game,
        });
        this.owner = owner;
        this.range = range;
        this.radius = radius;
        this.damage = damage;
        this.fuse_time = fuse_time;
        this.fuse_timer = new Timer();
        this.movement_time = 53;
        this.should_move = false;
        this.tiles_moved = 0;
        this.thrown = false;
        this.grenade = true;
        this.exploded = false;
        this.hittable = false;
        this.angle = 0;
        this.pitch = 0;
        var self = this;
        this.on_owner_move_listener = (coords) => self.on_owner_move(coords);
        this.start_tracking_owner();
    }
    private start_tracking_owner() {
        this.owner.on("move", this.on_owner_move_listener);
    }
    private stop_tracking_owner() {
        this.owner.off("move", this.on_owner_move_listener);
    }
    on_owner_move(coords: { x: number; y: number; z: number }): void {
        if (!this.thrown) this.move(coords.x, coords.y, coords.z, false);
        else this.stop_tracking_owner(); // Just in case that method hasn't been called until now.
    }
    explode(): void {
        this.stop_tracking_owner();
        if (this.exploded) return;
        this.exploded = true;
        var objects_in_radius: Game_object[] = [];
        var colliding = this.owner.map.objects.colliding({
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2 + 1,
            height: this.radius * 2 + 1,
        });
        for (let i of colliding) {
            var delta_x = i.x - this.x;
            var delta_y = i.y - this.y;
            var delta_z = i.z - this.z;
            var horizontal = delta_x ** 2 + delta_y ** 2;
            var square_distance = horizontal + delta_z ** 2;
            if (square_distance <= this.radius ** 2) {
                objects_in_radius.push(i);
            }
        }
        var players_colliding = this.owner.map.playersQuadtree.colliding({
            x: this.x - this.radius,
            y: this.y - this.radius,
            width: this.radius * 2 + 1,
            height: this.radius * 2 + 1,
        });
        for (let i of players_colliding) {
            var delta_x = i.x - this.x;
            var delta_y = i.y - this.y;
            var delta_z = i.z - this.z;
            var horizontal = delta_x ** 2 + delta_y ** 2;
            var square_distance = horizontal + delta_z ** 2;
            if (square_distance <= this.radius ** 2) {
                objects_in_radius.push(i);
            }
        }
        for (let i of objects_in_radius) {
            var delta_x = this.x - i.x;
            var delta_y = this.y - i.y;
            var delta_z = this.z - i.z;
            var sqhorizontal = delta_x ** 2 + delta_y ** 2;
            var distance = Math.sqrt(sqhorizontal + delta_z ** 2);
            if (distance == 0) distance = 1;
            if (i instanceof Entity)
                i.on_hit(this, Math.abs(this.damage / distance), false);
        }
        this.play_sound(
            "weapons/Fraggrenade/explode/",
            false,
            100,
            false,
            false,
            true,
            "movement",
            "weapons/Fraggrenade/dist/"
        );
        this.play_sound(
            "weapons/Fraggrenade/dist/",
            false,
            50,
            false,
            false,
            true,
            "distance"
        );
        this.death();
    }
    async throw(angle: number, pitch: number): Promise<void> {
        this.stop_tracking_owner();
        this.play_sound("weapons/Fraggrenade/throw.ogg");
        this.play_sound(
            "weapons/Fraggrenade/loop.ogg",
            true,
            100,
            false,
            false,
            true,
            "movement"
        );
        this.thrown = true;
        this.should_move = true;
        this.angle = angle;
        this.pitch = pitch;
    }
    play_land_sound(): void {
        switch (this.map.get_tile_at(this.x, this.y, this.z)) {
            case "wood":
                this.play_sound("weapons/Fraggrenade/land/wood.ogg");
                break;
            case "metal":
                this.play_sound("weapons/Fraggrenade/land/metal.ogg");
                break;
            case "water":
                this.play_sound("weapons/Fraggrenade/water.ogg");
                break;
            default:
                this.play_sound("weapons/Fraggrenade/land/dirt.ogg");
                break;
        }
    }
    async loop(): Promise<void> {
        if (this.fuse_timer.elapsed >= this.fuse_time && !this.exploded) {
            this.explode();
        }
        if (this.fuse_timer.elapsed > this.fuse_time * 2) {
            this.destroy();
        }
        if (
            this.should_move &&
            !this.exploded &&
            this.movement_timer.elapsed >= this.movement_time
        ) {
            this.movement_timer.restart();
            var dest = movement.move(
                [this.x, this.y, this.z],
                this.angle,
                this.pitch
            );
            if (
                this.tiles_moved <= this.range &&
                this.map.valid_straight_path(this, dest) === true
            ) {
                const dest_objects = this.map.get_objects_at(dest);
                if (!dest_objects.length || dest_objects.includes(this.owner)) {
                    this.tiles_moved += 1;
                    return this.move(dest.x, dest.y, dest.z, false);
                }
            }
            this.should_move = false;
            this.play_land_sound();
        }
    }
    on_interact(
        interactor: Game_object,
        angle: number,
        pitch: number
    ): boolean {
        if (this.owner === interactor && !this.thrown) this.throw(angle, pitch);
        return true;
    }
    destroy(): void {
        super.destroy();
        this.stop_tracking_owner();
    }
}
