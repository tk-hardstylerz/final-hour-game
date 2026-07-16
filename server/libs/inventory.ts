import Item from "./items/item";
import Server from "./networking";
import Player from "./objects/player";

export default class Inventory {
    server: Server;
    owner: Player;
    items: Item[];
    constructor(server: Server, owner: Player) {
        this.server = server;
        this.owner = owner;
        this.items = [];
    }
    find_item(name: string): Item | null {
        for (var i of this.items) {
            if (i.name === name) {
                return i;
            }
        }
        return null;
    }
    add_item(item: Item): void {
        var existing_item = this.find_item(item.name);
        if (existing_item) {
            existing_item.amount += item.amount;
        } else {
            this.items.push(item);
        }
    }
    take_item(name: string, amount = 1): Item {
        var item = this.find_item(name);
        if (item && item.amount >= amount) {
            item.amount -= amount;
            if (item.amount <= 0) {
                this.remove_item(item);
            }
            return item;
        }
        throw new Error(
            "The amount available of the item is less than the amount requested."
        );
    }
    remove_item(item: Item): void {
        this.items.splice(this.items.indexOf(item), 1);
    }
    clear(): void {
        this.items = [];
    }
}
