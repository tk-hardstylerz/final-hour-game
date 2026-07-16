import Server from "./networking";
import Player from "./objects/player";
import Timer from "./timer";
import timer from "./timer";
export default class Character {
    server: Server;
    owner: Player;
    name: string;
    char_name: string;
    sound_path: string;
    vocal_timer: Timer;
    constructor(server: Server, owner: Player, name: string) {
        this.server = server;
        this.owner = owner;
        this.name = name;
        this.char_name = "";
        switch (this.name) {
            case "dempsey":
                this.char_name = "Tank Dempsey";
                break;
            case "nikolai":
                this.char_name = "Nikolai Belinski";
                break;
            case "richtofen":
                this.char_name = "Doctor Edward Richtofen";
                break;
            case "takeo":
                this.char_name = "Takeo Masaki";
                break;
        }
        if (this.owner.game) {
            for (let i of this.owner.game.players) {
                i.speak(
                    `${this.owner.name} is playing as ${this.char_name}`,
                    true,
                    "match"
                );
            }
        }
        this.sound_path = `characters/${name}`;
        this.vocal_timer = new timer();
    }
    play_sound(sound: string, time = 5000): void {
        if (this.vocal_timer.elapsed >= time) {
            this.vocal_timer.restart();
            this.owner.play_sound(
                `${this.sound_path}/${sound}`,
                false,
                70,
                false,
                false,
                false,
                "vocal"
            );
        }
    }
}
