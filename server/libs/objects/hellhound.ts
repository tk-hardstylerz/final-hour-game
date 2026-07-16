import WorldMap from "../world_map";
import Server from "../networking";
import Tracker from "../tracker";
import Zomby_game from "../zomby_game";
import Game_object from "./object";
import zomby from "./zomby";
export default class Hellhound extends zomby {
    points_reward: number;
    audio_path: string;
    attack_time: number;
    volume: number;
    powerup_chance: number;
    movement_time: number;
    sound_path: string;
    destroy_time: number;
    range: number;
    explode_range: number;
    explode_damage: number;
    first: boolean = false;
    game?: Zomby_game;
    tracking?: Tracker;
    constructor(
        server: Server,
        x: number,
        y: number,
        z: number,
        hp: number,
        map: WorldMap
    ) {
        super(server, map, hp, 85, x, y, z);
        this.points_reward = 500;
        this.audio_path = "entities/hellhound";
        this.attack_time = 4000;
        this.volume = 100;
        this.powerup_chance = 10;
        this.movement_time = 301;
        this.sound_path = "entities/hellhound";
        this.destroy_time = 8000;
        this.range = 3;
        this.explode_range = 7;
        this.explode_damage = 85;
        this.play_sound(`${this.sound_path}/spawn.ogg`);
    }
    async loop(): Promise<void> {
        if (this.first) {
            await this.server.sleep_for(2300);
        }
        await super.loop();
    }
    death(object: Game_object): void {
        super.death(object);
        this.game?.call_after(3300, () => this.explode());
    }
    async attack(): Promise<boolean> {
        var attacked = await super.attack();
        if (attacked && this.tracking) this.tracking.reverse();
        return true;
    }
    async explode(): Promise<void> {
        this.play_sound(`${this.sound_path}/explode.ogg`);
        for (let i of this.map.get_players_at({
            x: this.x - this.explode_range,
            y: this.y - this.explode_range,
            z: this.z,
            height: this.explode_range * 2,
            width: this.explode_range * 2,
        })) {
            i.on_hit(this, this.explode_damage);
        }
    }
}
