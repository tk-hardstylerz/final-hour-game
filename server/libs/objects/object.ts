import consts from "../consts";
import EventEmitter from "../event_emitter";
import Server from "../networking";
import WorldMap from "../world_map";
import Game from "../game_mode";
import Player from "./player";
import TickExecutor, { OnTickExecutorCallbackFail } from "../tick_executor";
import Entity from "./entity";
import WrappedEntity, {
    WrappedEntityInterface,
} from "../map_scripts/wrapped_entity";
export default class Game_object extends EventEmitter<Game_object> {
    name: string;
    peer: any;
    server: Server;
    map: WorldMap;
    x: number;
    y: number;
    z: number;
    hittable: boolean;
    game?: Game;
    dead: boolean = false;
    wrapped: WrappedEntityInterface;
    wrappedEvents = new EventEmitter<WrappedEntityInterface>();
    protected destroied: boolean = false;
    get player(): boolean {
        return this instanceof Player;
    }
    private tickExecutor: TickExecutor;
    constructor(
        server: Server,
        map: WorldMap,
        name: string,
        x = 0,
        y = 0,
        z = 0,
        player = false,
        peer: any,
        game?: Game
    ) {
        super();
        this.name = name;
        this.peer = peer;
        this.server = server;
        this.map = map;
        this.x = x;
        this.y = y;
        this.z = z;
        this.hittable = true;
        this.game = game;
        this.wrapped = WrappedEntity(this);
        this.map.add_object(this, this.x, this.y, this.z);
        this.tickExecutor = new TickExecutor(this.server, this.loop.bind(this));
        this.tickExecutor.start();
    }
    on_hit(object?: Game_object, hp?: number): void {
        this.emit("hit");
        this.wrappedEvents.emit("hit", this.wrapped);
    }
    play_sound(
        sound: string,
        looping = false,
        volume = 100,
        streaming = false,
        excludeme = false,
        global = false,
        id = "",
        dist_path?: string
    ): void {
        if (!global) {
            this.map.send_area(
                consts.channel_sound,
                "play_sound",
                {
                    name: this.name,
                    sound: sound,
                    looping: looping,
                    volume: volume,
                    streaming: streaming,
                    id: id,
                    dist_path: dist_path,
                },
                { x: this.x - 40, y: this.y - 40, height: 80, width: 80 },
                excludeme ? [this.name] : []
            );
        } else {
            this.map.send(
                consts.channel_sound,
                "play_sound",
                {
                    name: this.name,
                    sound: sound,
                    looping: looping,
                    volume: volume,
                    streaming: streaming,
                    id: id,
                    dist_path: dist_path,
                },
                excludeme ? [this.name] : []
            );
        }
    }
    change_map(map: WorldMap, x?: number, y?: number, z?: number): void {
        if (this.map) {
            this.map.remove_object(this);
        }
        this.wrappedEvents.removeAllListeners();
        var spawn_coords = map.get_player_spawn();
        map.add_object(
            this,
            x ?? spawn_coords.x,
            y ?? spawn_coords.y,
            z ?? spawn_coords.z
        );
        this.map = map;
    }
    on_interact(
        interactor: Game_object,
        angle: number,
        pitch: number
    ): boolean {
        return false;
    }
    async loop(): Promise<void> {
        if (this.destroied) return;
    }
    emit(eventName: string): void {
        super.emit(eventName, this);
    }
    destroy(): void {
        if (!this.destroied) {
            this.destroied = true;
            this.tickExecutor.cancel();
            this.removeAllListeners();
            this.map.remove_object(this);
        }
    }
}
