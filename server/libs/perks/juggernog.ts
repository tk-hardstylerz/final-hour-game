import Entity from "../objects/entity";
import Perk from "./perk";

export default class Juggernog extends Perk {
    static readonly perkName = "Juggernog";
    static readonly description = "increases the owner's health by 150.";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        newOwner.maxHp += 150;
        newOwner.set_hp(newOwner.hp + 150);
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner) {
            this.currentOwner.maxHp-= 150;
            this.currentOwner.set_hp(this.currentOwner.hp- 150);
        }
        await super.detachFromCurrentOwner();
    }
}
