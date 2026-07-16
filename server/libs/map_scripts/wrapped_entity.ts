import EventEmitter from "../event_emitter";
import Entity from "../objects/entity";
import Game_object from "../objects/object";
import Player from "../objects/player";

export interface WrappedEntityInterface {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly id: string;
    readonly type: string;
    playSound: (
        sound: string,
        looping?: boolean,
        volume?: number,
        streaming?: boolean,
        excludeme?: boolean,
        global?: boolean,
        id?: string,
        dist_path?: string | undefined
    ) => void;
    move:
        | ((
              x: number,
              y: number,
              z: number,
              play_sound?: boolean,
              mode?: string,
              excludeme?: boolean
          ) => void)
        | undefined;
    speak:
        | ((
              text: string,
              interupt?: boolean,
              buffer?: string,
              sound?: string
          ) => void)
        | undefined;
    readonly events: EventEmitter<WrappedEntityInterface>;
}

export default function WrappedEntity(
    self: Game_object
): WrappedEntityInterface {
    return {
        get x(): number {
            return self.x;
        },
        get y(): number {
            return self.y;
        },
        get z(): number {
            return self.z;
        },
        get id(): string {
            return self.name;
        },
        get type(): string {
            if (self instanceof Player) {
                return "Player";
            } else if (self instanceof Entity) {
                return "Entity";
            } else if (self instanceof Game_object) {
                return "GameObject";
            }
            return "Unknown";
        },
        playSound: self.play_sound.bind(self),
        move: self instanceof Entity ? self.move.bind(self) : undefined,
        speak: self instanceof Player ? self.speak.bind(self) : undefined,
        get events() {
            return self.wrappedEvents;
        },
    };
}
