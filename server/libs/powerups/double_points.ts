import Game_object from "../objects/object";
import Zomby_game from "../zomby_game";
import LongtimePowerup from "./long_time_powerup";

export default class DoublePointsPowerup extends LongtimePowerup {
    constructor(game: Zomby_game) {
        super(game, {
            name: "Double points",
            announcement_sound: "powerups/doublepoints/get.ogg",
            end_sound: "powerups/doublepoints/end.ogg",
            powerup_time: 30000,
        });
    }
    async activate(activator?: Game_object): Promise<void> {
        await super.activate(activator);
        this.game.double_points = true;
    }
    async deactivate(): Promise<void> {
        await super.deactivate();
        this.game.double_points = false;
    }
}
