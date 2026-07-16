import Server from "../networking";
import Game_object from "../objects/object";
import Zomby_game from "../zomby_game";

export default class Powerup {
    server: Server;
    game: Zomby_game;
    name: string = "powerup";
    announcement_sound: string = "";
    constructor(
        game: Zomby_game,
        options?: {
            name: string;
            announcement_sound?: string;
        }
    ) {
        this.game = game;
        this.server = game.server;
        if (options) {
            this.name = options.name;
            this.announcement_sound = options.announcement_sound ?? "";
        }
    }
    async activate(activator?: Game_object): Promise<void> {
        for (let player of this.game.players) {
            if (this.announcement_sound) {
                player.play_direct(this.announcement_sound, false, 30);
            }
        }
    }
}
