import Server from "../networking";
import Entity from "../objects/entity";
import Player from "../objects/player";
import Item from "./item";


export default class Flare_item extends Item {
    constructor(server: Server, owner: Player, amount = 0) {
        super(
            server, owner, amount, "flare", "a flare used to help other players find you audibly"
        );
    }
    action_1(): void {
        
    }
}