import consts from "../consts";
import Entity from "../objects/entity";
import Player from "../objects/player";
import Perk from "./perk";

export default class Staminup extends Perk {
    static readonly perkName = "Staminup";
    static readonly description = "Increases the owner's movement speed";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        if (newOwner instanceof Player) {
            newOwner.send(consts.channel_misc, "staminup", {
                value: true,
            });
        }
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner && this.currentOwner instanceof Player) {
            this.currentOwner.send(
                consts.channel_misc,
                "staminup",
                { value: false }
            );
        }
        await super.detachFromCurrentOwner();
    }
}
