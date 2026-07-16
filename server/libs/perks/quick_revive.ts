import Entity from "../objects/entity";
import Player from "../objects/player";
import Perk from "./perk";

export default class QuickRevive extends Perk {
    static readonly perkName = "quick_revive";
    static readonly description = "Diminishes the owner's revive time by half or in a solo match, allows them to revive themself";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        if (newOwner instanceof Player) newOwner.quick_revive = true;
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner && this.currentOwner instanceof Player) {
            this.currentOwner.quick_revive = false;
        }
        await super.detachFromCurrentOwner();
    }
}
