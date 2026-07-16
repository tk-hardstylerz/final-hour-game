import Entity from "./entity";
import Timer from "../timer";
import consts from "../consts";
import * as movement from "../movement";
import Player from "./player";
import Server from "../networking";
import WorldMap from "../world_map";
import Game from "../game_mode";
import Grappler_item from "../items/grappler";

export default class Grappler_entity extends Entity {
    owner: Player;
    range: number;
    should_move: boolean;
    owner_should_move: boolean;
    tiles_moved: number;
    owner_tiles_moved: number;
    grapple: Grappler_item;
    thrown: boolean;
    hittable: boolean;
    angle: number;
    pitch: number;
    constructor(
        server: Server,
        owner: Player,
        grapple_item: Grappler_item,
        range = 30,
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
            game,
        });
        this.owner = owner;
        this.range = range;
        this.should_move = false;
        this.owner_should_move = false;
        this.tiles_moved = 0;
        this.owner_tiles_moved = 0;
        this.grapple = grapple_item;
        this.thrown = false;
        this.hittable = false;
        this.angle = 0;
        this.pitch = 0;
        var self = this;
        this.owner.on("move", (coords) => self.on_owner_move(coords));
    }
    on_owner_move(coords: { x: number; y: number; z: number }): void {
        if (!this.thrown) this.move(coords.x, coords.y, coords.z, false);
        else this.owner.off("move", this.on_owner_move);
    }
    async throw(angle: number, pitch: number): Promise<void> {
        this.play_sound("items/grappler/fire/");
        this.thrown = true;
        this.should_move = true;
        this.angle = angle;
        this.pitch = pitch;
    }
    play_land_sound(): void {
        this.play_sound("items/grappler/impact/");
    }
    async loop(): Promise<void> {
        if (this.should_move && this.movement_timer.elapsed >= 1) {
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

        if (this.owner_should_move && this.movement_timer.elapsed >= 10) {
            this.movement_timer.restart();
            var dest = movement.move(
                [this.x, this.y, this.z],
                this.angle,
                this.pitch
            );
            if (
                this.owner_tiles_moved <= this.range &&
                this.map.valid_straight_path(this.owner, dest) === true
            ) {
                this.tiles_moved += 1;
                return this.owner.send(consts.channel_movement, "move", {
                    name: this.owner.name,
                    x: dest.x,
                    y: dest.y,
                    z: this.z,
                    play_sound: false,
                    mode: "walk",
                });
            }
            this.owner_should_move = false;
        }
    }
    async pull(): Promise<void> {
        this.owner_should_move = true;
        this.owner.play_sound("items/grappler/pull_start.ogg");
        this.owner.play_sound("items/grappler/pull_end.ogg");
    }
}
