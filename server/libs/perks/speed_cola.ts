import consts from "../consts";
import Entity from "../objects/entity";
import Player from "../objects/player";
import Perk from "./perk";

export default class speed_cola extends Perk {
    static readonly perkName = "speed_cola";
    static readonly description = "Decreases the reload time of weapons";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        if (newOwner instanceof Player)             {
            newOwner.send(consts.channel_weapons, "speed_cola", {
                value: true
            });
            newOwner.speed_cola = true
        }

    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner && this.currentOwner instanceof Player) {
            this.currentOwner.send(consts.channel_weapons, "speed_cola", {
                value: false
            });
            this.currentOwner.speed_cola = false;
        }
        await super.detachFromCurrentOwner();
    }
}
