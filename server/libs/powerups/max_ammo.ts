import Game_object from "../objects/object";
import Zomby_game from "../zomby_game";
import Powerup from "./powerup";

export default class MaxAmmoPowerup extends Powerup {
    constructor(game: Zomby_game) {
        super(game, {
            name: "Max ammo",
            announcement_sound: "powerups/maxammo/get.ogg",
        });
    }
    async activate(activator?: Game_object): Promise<void> {
        await super.activate();
        for (let player of this.game.players) {
            for (let weapon_index in player.weapon_manager.weapons) {
                var weapon = player.weapon_manager.weapons[weapon_index];
                player.weapon_manager.modify(parseInt(weapon_index), {
                    ammo: weapon.max_ammo,
                    reserved_ammo: weapon.max_reserved_ammo,
                });
            }
        }
    }
}
