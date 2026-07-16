import Server from "../networking";
import WorldMap from "../world_map";
import Game_object from "./object";
import GameObject from "./object";
import PerkMachine from "./perk_machine";
import Player from "./player";

export default class PowerSwitch extends GameObject {
    private cost: number = 0;
    constructor(
        server: Server,
        attributes: {
            map: WorldMap;
            x: number;
            y: number;
            z: number;
            cost?: number;
        }
    ) {
        super(
            server,
            attributes.map,
            `PowerSwitch-${server.get_id()}`,
            attributes.x,
            attributes.y,
            attributes.z,
            false,
            null,
            attributes.map.game
        );
        this.initializeAttributes(attributes);
    }
    private initializeAttributes(attributes: any): void {
        this.cost = attributes.cost ?? 0;
    }
    on_interact(
        interactor: Game_object,
        angle: number,
        pitch: number
    ): boolean {
        super.on_interact(interactor, angle, pitch);
        if (!this.map.isPowerOn && interactor instanceof Player) {
            this.handlePlayerInteraction(interactor);
        }
        return true;
    }
    private handlePlayerInteraction(player: Player): void {
        if (player.game && player.points < this.cost) {
            player.speak(`You need at least ${this.cost} points to use this`);
            return;
        }
        this.map.isPowerOn = true;
        this.map.objects.each((i) => {
            if (i instanceof PerkMachine && i.isActive) {
                i.play_sound(
                    i.sound,
                    true,
                    30,
                    false,
                    false,
                    true,
                    this.name
                );
            }
        })
        this.play_sound("power/flip.ogg");
        this.map.playersQuadtree.each((player) =>
            player.play_direct("power/turn_on.ogg", false, 10)
        );
    }
}
