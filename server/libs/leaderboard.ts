import Sequelize from "sequelize";
import Menu, { MenuOption } from "./menu";
import Server from "./networking";
interface LeaderboardMenuOption extends MenuOption {
    kills: number;
    points: number;
    accuracy: number;
}
export default class Leaderboard {
    server: Server;
    constructor(server: Server) {
        this.server = server;
    }
    async get_kills_leaderboard(peer: any): Promise<void> {
        var leaderboard: LeaderboardMenuOption[] = [];
        var users = await this.server.database.users.findAll();
        for (let i in users) {
            leaderboard.push({
                title: users[i].username + ": " + users[i].high_kills,
                value: users[i].username + ": " + users[i].high_kills,
                close: false,
                kills: users[i].high_kills,
                points: 0,
                accuracy: 0,
            });
        }
        leaderboard.sort((a, b) => {
            return b.kills - a.kills;
        });
        var m = new Menu(this.server, "kills leaderboard", "copy_menu_lb");
        for (let i of leaderboard) {
            let pos = leaderboard.indexOf(i) + 1;
            let title = pos + ": " + i.title;
            i.title = title;
            i.value = title;
            m.add_option(i.title, i.value, i.close);
        }
        m.send(peer);
    }
    async get_points_leaderboard(peer: any): Promise<void> {
        var leaderboard: LeaderboardMenuOption[] = [];
        var users = await this.server.database.users.findAll();
        for (let i in users) {
            leaderboard.push({
                title: users[i].username + ": " + users[i].high_points,
                value: users[i].username + ": " + users[i].high_points,
                close: false,
                points: users[i].high_points,
                kills: 0,
                accuracy: 0,
            });
        }
        leaderboard.sort((a, b) => {
            return b.points - a.points;
        });
        var m = new Menu(
            this.server,
            "points highscore leaderboard",
            "copy_menu_lb"
        );
        for (let i of leaderboard) {
            let pos = leaderboard.indexOf(i) + 1;
            let title = pos + ": " + i.title;
            i.title = title;
            i.value = title;
            m.add_option(i.title, i.value, i.close);
        }
        m.send(peer);
    }
    async get_accuracy_leaderboard(peer: any): Promise<void> {
        var leaderboard: LeaderboardMenuOption[] = [];
        var users = await this.server.database.users.findAll();
        for (let i in users) {
            leaderboard.push({
                title: users[i].username + ": " + users[i].high_accuracy +"%",
                value: users[i].username + ": " + users[i].high_accuracy +"%",
                close: false,
                points: 0,
                kills: 0,
                accuracy: users[i].high_accuracy,
            });
        }
        leaderboard.sort((a, b) => {
            return b.accuracy - a.accuracy;
        });
        var m = new Menu(
            this.server,
            "accuracy board",
            "copy_menu_lb"
        );
        for (let i of leaderboard) {
            let pos = leaderboard.indexOf(i) + 1;
            let title = pos + ": " + i.title;
            i.title = title;
            i.value = title;
            m.add_option(i.title, i.value, i.close);
        }
        m.send(peer);
    }
}
