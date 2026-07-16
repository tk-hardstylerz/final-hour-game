import Server from "./networking";
import Player from "./objects/player";

export default class Language_channel {
    server: Server;
    name: string;
    players: Player[];
    constructor(server: Server, name: string) {
        this.server = server;
        this.name = name;
        this.players = [];
    }
    add_player(player: Player): void {
        player.language_channel = this;
        player.language_channel_name = this.name;
        this.players.push(player);
    }
    remove_player(player: Player): void {
        player.language_channel = undefined;
        player.language_channel_name = "";
        this.players.splice(this.players.indexOf(player), 1);
    }
    send(message: string, user: Player, buffer = "chat"): void {
        for (let i of this.players) {
            if (user && user.user.block_list.includes(i.user.username)) continue;
            else i.speak(message, false, buffer, "ui/chat.ogg");
        }
    }
}
