import consts from "./consts";
import Server from "./networking";
export interface MenuOption {
    title: string;
    value: any;
    close: boolean;
}
export default class Menu {
    server: Server;
    title: string;
    event: string;
    options: MenuOption[];
    constructor(server: Server, title: string, event: string) {
        this.server = server;
        this.title = title;
        this.event = event;
        this.options = [];
    }
    add_option(title: string, value: any, close = true): void {
        this.options.push({ title: title, value: value, close: close });
    }
    add_options(
        options: [string, any][] | [string, any, boolean][]
    ): void {
        for (let i of options) {
            this.add_option(i[0], i[1], i[2] ?? true);
        }
    }
    send(peer: any): void {
        const options: MenuOption[] = [];
        var data = { event: this.event, title: this.title, options: options }
        for (let i of this.options) {
            data.options.push({
                title: i.title,
                value: i.value,
                close: i.close,
            });
        }
        this.server.send(peer, consts.channel_menus, "make_menu", data);
    }
}
