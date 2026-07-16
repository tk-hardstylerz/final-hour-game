import Game_object from "../objects/object";
import Zomby from "../objects/zomby";
import Zomby_game from "../zomby_game";
import Powerup from "./powerup";


export default class NukePowerUp extends Powerup {
    constructor(game: Zomby_game) {
        super(game, {
            name: "nuke",
            announcement_sound: "powerups/nuke/get.ogg"
        });
    }
    async activate(activator?: Game_object): Promise<void> {
        await super.activate();
        const objects = this.game.map.objects.get({});
        for (let i of objects) {
            if (i instanceof Zomby) i.destroy(false);
        }


    }
}