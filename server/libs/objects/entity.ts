import consts from "../consts";
import Game from "../game_mode";
import WorldMap from "../world_map";
import Server from "../networking";
import timer from "../timer";
import Game_object from "./object";
import game_object from "./object";
import { calculate_angle } from "../movement";
import Blackboard from "../behavior_tree/blackboard";
import Node from "../behavior_tree/node";
import {
    parseBehaviorTreeNode,
    parseBehaviorTreeXml,
} from "../behavior_tree/parser";
import { XmlElement } from "xmldoc";
import Player from "./player";
export default class Entity extends game_object {
    hp: number;
    movement_timer: timer;
    defaultMaxHp = 100;
    maxHp: number;
    blackboard: Blackboard;
    protected behaviorTree?: Node;
    constructor(
        {
            server,
            map,
            name,
            x = 0,
            y = 0,
            z = 0,
            hp = 100,
            game = undefined,
        }: {
            server: Server;
            map: WorldMap;
            name: string;
            x?: number;
            y?: number;
            z?: number;
            hp?: number;
            game?: Game;
        },
        player = false,
        peer?: any
    ) {
        super(server, map, name, x, y, z, player, peer, game);
        this.hp = hp;
        this.movement_timer = new timer();
        this.maxHp = this.defaultMaxHp;
        this.blackboard = new Blackboard(this);
    }

    resetBlackboard(): void {
        this.blackboard.stack.clear();
        this.blackboard.context = {};
    }
    resetBehavior(behaviorTree?: Node | XmlElement): void {
        if (behaviorTree !== this.behaviorTree) {
            this.resetBlackboard();
            this.behaviorTree =
                behaviorTree instanceof Node || behaviorTree === undefined
                    ? behaviorTree
                    : parseBehaviorTreeNode(behaviorTree, this.blackboard);
        }
    }
    async loop(): Promise<void> {
        this.behaviorTree?.tick();
    }
    move(
        x: number,
        y: number,
        z: number,
        play_sound = true,
        mode = "walk",
        excludeme = true,
        angle=0
    ): void {
        var newAngle: number;
        if (this instanceof Player) newAngle = angle;
        else newAngle = calculate_angle(this.x, x, this.y, y, this.z, z, 0);
        this.x = x;
        this.y = y;
        this.z = z;
        this.emit("move");
        this.wrappedEvents.emit("move", this.wrapped);
        this.map.send(
            consts.channel_movement,
            "move",
            {
                name: this.name,
                x: x,
                y: y,
                z: z,
                play_sound: play_sound,
                mode: mode,
                angle: newAngle,
            },
            excludeme ? [this.name] : []
        );
    }
    turn(direction: number, play_sound = false, excludeme = true) {
        this.map.send(
            consts.channel_movement,
            "turn",
            { name: this.name, direction: direction, play_sound: play_sound },
            excludeme ? [this.name] : []
        );
    }
    on_hit(object: Game_object, hp = 0, excludeme = true): void {
        super.on_hit(object, hp);
        this.hp -= hp;
        if (this.hp <= 0) {
            this.death(object);
        }
    }
    set_hp(amount: number): void {
        this.hp = amount;
    }
    death(object?: Game_object): void {
        this.emit("death");
        this.wrappedEvents.emit("death", this.wrapped);
    }
}
