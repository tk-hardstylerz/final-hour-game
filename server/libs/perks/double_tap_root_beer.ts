import consts from "../consts";
import Entity from "../objects/entity";
import Player from "../objects/player";
import Perk from "./perk";

export default class double_tap_root_beer extends Perk {
    static readonly perkName = "double_tap_root_beer";
    static readonly description = "double the rate of fire of weapons";
    async atachTo(newOwner: Entity): Promise<void> {
        await super.atachTo(newOwner);
        if (newOwner instanceof Player)             newOwner.send(consts.channel_weapons, "double_tap_root_beer", {
            value: true
        });
;
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this.currentOwner && this.currentOwner instanceof Player) {
            this.currentOwner.send(consts.channel_weapons, "double_tap_root_beer", {
                value: false
            });
        }
        await super.detachFromCurrentOwner();
    }
}
