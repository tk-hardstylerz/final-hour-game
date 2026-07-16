import EventEmitter from "./event_emitter";
import Server from "./networking";
import Entity from "./objects/entity";
import Perk from "./perks/perk";

export default class PerkManager {
    readonly server: Server;
    readonly owner: Entity;
    readonly slotChangeEvents = new EventEmitter<number>();
    perks = new Array<Perk | null>(4).fill(null);
    constructor(server: Server, owner: Entity) {
        this.server = server;
        this.owner = owner;
    }
    async setPerkOnSlot(slotIndex: number, perk: Perk, atachToOwner = true): Promise<void> {
        if (slotIndex >= 0 && slotIndex < this.perks.length) {
            if (!this.perks[slotIndex]) {
                this.perks[slotIndex] = perk;
                this.slotChangeEvents.emit("set", slotIndex);
                if (atachToOwner) await perk.atachTo(this.owner);
            } else {
                throw new Error(
                    "Attempted setting a perk on an already taken slot."
                );
            }
        } else {
            throw new Error("Invalid slot index");
        }
    }
    async replacePerkOnSlot(slotIndex: number, newPerk: Perk, reatach = true): Promise<void> {
        await this.unsetPerkFromSlot(slotIndex, reatach);
        await this.setPerkOnSlot(slotIndex, newPerk, reatach);
    }
    unsetPerkFromSlot(slotIndex: number, detachFromOwner = true): void {
        if (slotIndex >= 0 && slotIndex < this.perks.length) {
            if (this.perks[slotIndex]) {
                let perk = this.perks[slotIndex];
                this.perks[slotIndex] = null;
                this.slotChangeEvents.emit("unset", slotIndex);
                if (detachFromOwner && perk?.currentOwner === this.owner)
                    perk?.detachFromCurrentOwner();
            } else {
                throw new Error("Attempted to unset an empty perk slot");
            }
        } else {
            throw new Error("Invalid slot index");
        }
    }
    getPerkFromSlot(slotIndex: number): Perk | null {
        if (slotIndex >= 0 && slotIndex < this.perks.length) {
            return this.perks[slotIndex];
        } else {
            throw new Error("Invalid slot index");
        }
    }
    findFirstEmptySlot(): number | null {
        for (let i = 0; i < this.perks.length; i++) {
            if (!this.perks[i]) {
                return i;
            }
        }
        return null;
    }
    get assignedPerks(): number {
        let count = 0;
        for (const perk of this.perks) {
            if (perk !== null) {
                count++;
            }
        }
        return count;
    }
    indexOfPerkAssigned(perkType: typeof Perk): number | null {
        for (let i = 0; i < this.perks.length; i++) {
            if (this.perks[i] instanceof perkType) {
                return i;
            }
        }
        return null;
    }
    isPerkAssigned(perkType: typeof Perk): boolean {
        return this.indexOfPerkAssigned(perkType) !== null;
    }
    clear(detachFromOwner = true): void {
        for (let i = 0; i < this.perks.length; i++) {
            if (this.perks[i]) this.unsetPerkFromSlot(i, detachFromOwner);
        }
    }
}
