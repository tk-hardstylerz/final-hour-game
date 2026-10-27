import Entity from "../objects/entity";
import Player from "../objects/player";
import Perk from "./perk";

export default class WhosWho extends Perk {
    static readonly perkName = "whos_who";
    static readonly description = "When the owner is downed, their ghost clone takes over and can revive them, keeping all of their perks";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        if (newOwner instanceof Player) newOwner.whos_who = true;
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner && this.currentOwner instanceof Player) {
            this.currentOwner.whos_who = false;
        }
        await super.detachFromCurrentOwner();
    }
}
