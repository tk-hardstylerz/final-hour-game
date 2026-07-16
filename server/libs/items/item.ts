import Server from "../networking";
import Entity from "../objects/entity";
import Player from "../objects/player";

//base item class
export default class Item {
    server: Server;
    name: string;
    description: string;
    amount: number;
    owner: Player;
    use_amount: number;
    constructor(
        server: Server,
        owner: Player,
        amount = 0,
        name = "item",
        description = "An item that does nothing",
        use_amount = 1
    ) {
        this.server = server;
        this.name = name;
        this.description = description;
        this.amount = amount;
        this.use_amount = use_amount;
        this.owner = owner;
    }
    action_1() {
        //called when the owner invokes action1 on this item.
    }
    action_2() {
        //called when the owner invokes action2 on this item
    }
    loop() {
        //a function that will be called each time the main loop loops through the owner of this item.
    }
}
