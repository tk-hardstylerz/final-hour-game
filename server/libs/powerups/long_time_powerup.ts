import Game_object from "../objects/object";
import Timer from "../timer";
import Zomby_game from "../zomby_game";
import Powerup from "./powerup";

export default class LongtimePowerup extends Powerup {
    powerup_time: number = 30000;
    active_sound: string = "";
    end_sound: string = "";
    is_active: boolean = false;
    active_timer: Timer = new Timer();
    private readonly active_sound_id = `powerup_${this.name}`;
    constructor(
        game: Zomby_game,
        options: {
            name: string;
            announcement_sound: string;
            powerup_time?: number;
            active_sound?: string;
            end_sound?: string;
        }
    ) {
        super(game, options);
        this.powerup_time = options.powerup_time ?? 30000;
        this.active_sound = options.active_sound ?? "";
        this.end_sound = options.end_sound ?? "";
    }
    async activate(activator?: Game_object | undefined): Promise<void> {
        this.is_active = true;
        this.active_timer.restart();
        for (let player of this.game.players) {
            if (this.announcement_sound) {
                player.play_direct(this.announcement_sound, false, 30);
                if (this.active_sound) {
                    player.play_direct(
                        this.active_sound,
                        true,
                        26,
                        false,
                        false,
                        this.active_sound_id
                    );
                }
            }
        }
    }
    async update(): Promise<void> {}
    async deactivate(): Promise<void> {
        this.is_active = false;
        for (let player of this.game.players) {
            if (this.end_sound) {
                player.play_direct(
                    this.end_sound,
                    false,
                    26,
                    false,
                    false,
                    this.active_sound_id
                );
            }
        }
    }
}
