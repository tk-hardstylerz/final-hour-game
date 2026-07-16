import * as random from "./random";
import consts from "./consts";
import Server from "./networking";
import WorldMap from "./world_map";
import Player from "./objects/player";
import channel_id from "./channel_id";
import PlayerContainer from "./player_container";

export default class Game extends PlayerContainer {
    get_dead_players(): number {
        throw new Error("Method not implemented.");
    }
    end(): void {
        throw new Error("Method not implemented.");
    }
    map: WorldMap;
    name: string;
    zomby_character_names: string[];
    public_: boolean;
    owner: Player;
    max_players: number;
    scores: Record<string, Record<string, any>>;
    started: boolean;
    delayed_functions: NodeJS.Timeout[];
    zomby_game: boolean = false;
    protected destroied: boolean = false;
    constructor(
        server: Server,
        owner: Player,
        name: string,
        map: WorldMap,
        max_players = 4,
        public_ = true
    ) {
        super(server);
        this.map = map;
        this.name = name;
        this.zomby_character_names = [
            "dempsey",
            "nikolai",
            "richtofen",
            "takeo",
        ];
        random.shuffle_array(this.zomby_character_names);
        this.map.game = this;
        this.public_ = public_;
        this.owner = owner;
        this.max_players = max_players;
        this.scores = {};
        this.started = false;
        this.add_player(owner);
        this.delayed_functions = [];
        if (public_) this.server.add_game(this);
        this.server.discord.update(
            `${this.server.players.length} players online and ${this.server.games.length} matches`
        );
        this.server.discord.send_message(this.name, channel_id.botannouncements, "Match Announcer");
    }
    call_after(ms: number, func: () => void | Promise<void>): void {
        var self = this;
        var id = setTimeout(() => {
            func();
            self.delayed_functions.splice(
                this.delayed_functions.indexOf(id),
                1
            );
        }, ms);
        this.delayed_functions.push(id);
        this.server.discord.update(
            `${this.server.players.length} players online and ${this.server.games.length} matches`
        );
    }
    add_player(player: Player, speak = true): boolean {
        if (this.players.size > this.max_players) {
            return false;
        }
        if (!this.add(player)) {
            return false;
        }
        this.scores[player.name] = {};
        this.scores[player.name].accuracy = player.high_accuracy;
        player.game = this;
        if (speak) {
            this.speak(`${player.name} joined the match.`);
        }
        return true;
    }
    remove_player(player: Player, speak = true, destroy_if_empty = true): void {
        player.send(consts.channel_weapons, "exit_match", {});
        var hpoints = false;
        var hkills = false;
        var haccuracy = false;
        if (this.scores[player.name].kills > player.high_kills) {
            player.high_kills = this.scores[player.name].kills;
            hkills = true;
        }
        if (this.scores[player.name].points > player.high_points) {
            player.high_points = this.scores[player.name].points;
            hpoints = true;
        }
        player.high_accuracy = this.scores[player.name].accuracy;
        player.save();
        if (hpoints == true && hkills == true) {
            this.server.speak(
                `${player.user.username} has just gained a high score, they have reached ${player.high_kills} kills and ${player.high_points} points! They had an accuracy of ${player.high_accuracy}%. `,
                false,
                "notifications"
            );
            this.server.maps["main"].playersQuadtree.each((i) => {
                i.play_direct("achievements/", false, 50)
            });
            player.play_direct("achievements/", false, 50)
        } else if (hpoints == true && hkills == false) {
            this.server.speak(
                `${player.user.username} has just gained a high score, they have reached ${player.high_points} points! They had an accuracy of ${player.high_accuracy}. `,
                false,
                "notifications"
            );
            this.server.maps["main"].playersQuadtree.each((i) => {
                i.play_direct("achievements/", false, 50)
            });
            player.play_direct("achievements/", false, 50)
        } else if (hkills == true && hpoints == false) {
            this.server.speak(
                `${player.user.username} has just gained a high score, they have reached ${player.high_kills} kills! they had an accuracy of ${player.high_accuracy}%. `,
                false,
                "notifications"
            );
            this.server.maps["main"].playersQuadtree.each((i) => {
                i.play_direct("achievements/", false, 50)
            });
            player.play_direct("achievements/", false, 50)

        }
        player.send(consts.channel_map, "update_mumble_context", {
            context: player.map.mapName,
        });
        if (speak) {
            this.speak(`${player.name} left the match.`);
        }
        this.remove(player);
        delete this.scores[player.name];
        player.game = undefined;
        if (speak && player === this.owner && this.players.size) {
            this.owner = Array.from(this.players)[0];
            this.speak(
                `This match's ownership has been given to ${this.owner.name}.`,
                false
            );
        }
        if (player.map === this.map) {
            player.change_map(this.server.maps.main);
        }
        if (destroy_if_empty && !this.players.size) {
            this.destroy();
        }
        if (this.players.size == 1 && Array.from(this.players)[0].dead) {
            this.destroy();
        }
    }
    start(): void {
        this.started = true;
        this.server.discord.send_message(
            `${this.owner.user.username} has started their match with ${
                this.players.size - 1
            } other players. `,
            channel_id.botannouncements,
            "Match Announcer"
        );
        for (let i of this.players) {
            if (i.character) {
                var activity = {
                    round: 1,
                    character: i.character.char_name,
                    map: this.map.mapName,
                    party_id: this.owner.user.username + "'s match",
                    size: this.players.size,
                };
                i.send(consts.channel_misc, "update_activity", activity);
                i.send(consts.channel_weapons, "enter_match", {});
                i.send(consts.channel_map, "update_mumble_context", {
                    context: this.owner.name + "'s match",
                });
                for (let p of this.players) {
                    p.speak(
                        i.name + " is playing as " + i.character.char_name,
                        true,
                        "match"
                    );
                }
            }
        }
        for (var i of this.players) {
            i.change_map(this.map);
        }
    }
    destroy(): void {
        if (!this.destroied) {
            this.destroied = true;
            if (this.map) this.map.destroy();
            if (this.public_) this.server.remove_game(this);
            this.started = false;
            for (const player of new Set(this.players)) {
                var activity = {
                    round: 0,
                    character: player.user.username,
                    map: player.map.mapName,
                    party_id: "",
                    size: 0,
                };
                player.send(consts.channel_misc, "update_activity", activity);
                this.remove_player(player, false, false);
            }
            for (var delayed_function of this.delayed_functions) {
                clearTimeout(delayed_function);
            }
            this.delayed_functions = [];
            this.server.discord.update(
                `${this.server.players.length} players online and ${this.server.games.length} matches`
            );
        }
    }
}
