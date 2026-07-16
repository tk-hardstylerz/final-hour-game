import EventEmitter from "./event_emitter";
import Server from "./networking";
import Player from "./objects/player";

export default class PlayerContainer extends EventEmitter<Player> {
    server: Server;
    players: Set<Player> = new Set();
    constructor(server: Server) {
        super();
        this.server = server;
    }
    speak(
        text: string,
        interupt = true,
        buffer = "match",
        sound = "",
        excludes: string[] = []
    ): void {
        for (const player of this.players) {
            if (!excludes.includes(player.name))
                player.speak(text, interupt, buffer, sound);
        }
    }
    add(player: Player): boolean {
        if (this.players.has(player)) return false;
        this.players.add(player);
        this.emit("playerAdded", player);
        return true;
    }
    remove(player: Player): boolean {
        const isDeleted = this.players.delete(player);
        if (isDeleted) {
            this.emit("playerRemoved", player);
        }
        return isDeleted;
    }
    send(
        channel: number,
        event: string,
        data: Record<string, any>,
        excludes: string[] = []
    ): void {
        for (const player of this.players) {
            if (!excludes.includes(player.name)) {
                player.send(channel, event, data);
            }
        }
    }
}
