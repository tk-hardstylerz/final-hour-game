import WorldMap from "../world_map";
import Mapobj from "../world_map/elements/mapobj";
import Server from "../networking";
import entity from "./entity";
import Game_object from "./object";
import Player from "./player";
import Platform from "../world_map/elements/platform";
import { uuid } from "@supercharge/strings";
export default class Window extends entity {
    max_hp: number;
    being_hit: boolean;
    fix_cost: number;
    window: boolean;
    open: boolean;
    sound_path: string;
    tile: Platform;
    constructor(
        server: Server,
        map: WorldMap,
        x: number,
        y: number,
        z: number,
        hp = 500
    ) {
        super({
            server: server,
            map: map,
            name: `window${server.get_id()}`,
            x: x,
            y: y,
            z: z,
            hp: hp,
        });
        this.max_hp = hp;
        this.being_hit = false;
        this.fix_cost = hp * 2;
        this.window = true;
        this.open = false;
        this.dead = false;
        this.sound_path = "entities/window";
        this.tile = new Platform(this.map, {
            minx: this.x,
            maxx: this.x,
            miny: this.y,
            maxy: this.y,
            minz: this.z,
            maxz: this.z,
            type: "window",
            id: uuid(),
        });
        this.map.allElements.splice(this.map.allElements.indexOf(this.tile), 1);
        this.removeTileFromMap(); // Because creating a new platform automaticly adds it to the map and we do not need that at first.
        this.hittable = false;
    }
    in_bound(x: number, y: number, z: number): boolean {
        return (
            x >= this.x - 1 &&
            x <= this.x + 1 &&
            y >= this.y - 1 &&
            y <= this.y + 1 &&
            z >= this.z - 1 &&
            z <= this.z + 1
        );
    }
    async fix(time = 4400): Promise<void> {
        this.open = false;
        this.dead = false;
        this.play_sound(
            `${this.sound_path}/fix`,
            false,
            100,
            false,
            false,
            true,
            "window"
        );
        this.removeTileFromMap();
        this.hp = this.max_hp;
    }
    private removeTileFromMap() {
        this.map.platforms.splice(this.map.platforms.indexOf(this.tile), 1);
    }

    break(): void {
        this.play_sound(`${this.sound_path}/break`);
        this.play_sound(
            `${this.sound_path}/loop.ogg`,
            true,
            50,
            false,
            false,
            true,
            "window"
        );
        this.pushTileToMap();
        this.open = true;
        this.dead = true;
    }
    private pushTileToMap() {
        this.map.platforms.push(this.tile);
    }

    on_hit(obj: Game_object, hp: number): void {
        if (!(obj instanceof Player)) {
            this.play_sound(`${this.sound_path}/damage`);
            super.on_hit(obj, hp);
        }
    }
    on_interact(
        interactor: Game_object,
        angle: number,
        pitch: number
    ): boolean {
        if (interactor instanceof Player) {
            if (this.open && interactor.points >= this.fix_cost) {
                this.fix();
                interactor.points = interactor.points - this.fix_cost;
                return true;
            } else if (!this.open) {
                interactor.speak("This window is already closed", true, "match");
            } else {
                interactor.speak(`This window costs ${this.fix_cost} points to repair`, true, "match");
            }
        }
        return false;
    }
    death(obj: Game_object): void {
        this.break();
    }
}
