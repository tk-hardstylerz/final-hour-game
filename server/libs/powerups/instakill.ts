import Game_object from "../objects/object";
import Zomby_game from "../zomby_game";
import LongtimePowerup from "./long_time_powerup";

export default class InstakillPowerup extends LongtimePowerup {
    constructor(game: Zomby_game) {
        super(game, {
            name: "Instakill",
            announcement_sound: "powerups/instakill/get.ogg",
            end_sound: "powerups/instakill/end.ogg",
            powerup_time: 30000,
        });
    }
    async activate(activator?: Game_object): Promise<void> {
        await super.activate(activator);
        this.game.instakill = true;
    }
    async deactivate(): Promise<void> {
        await super.deactivate();
        this.game.instakill = false;
    }
}
