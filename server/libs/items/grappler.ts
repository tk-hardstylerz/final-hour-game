import Item from "./item";
import Grappler_entity from "../objects/grappler";
import Entity from "../objects/entity";
import Server from "../networking";
import Player from "../objects/player";

export default class Grappler_item extends Item {
    range: number;
    ready: boolean;
    target: Grappler_entity | null;
    constructor(server: Server, owner: Player, amount = 0, range = 30) {
        super(
            server,
            owner,
            amount,
            "grappler",
            "a grappling hook used to travel places"
        );
        this.range = range;
        this.ready = false;
        this.target = null;
    }
    action1() {
        if (this.owner.dead || this.ready) return;
        this.target = new Grappler_entity(
            this.server,
            this.owner,
            this,
            this.range,
            this.name,
            this.owner.map,
            this.owner.x,
            this.owner.y,
            this.owner.z,
            this.owner.game
        );
        this.ready = true;
        this.owner.speak("You prepare the grappler");
        this.owner.play_sound("items/grappler/equip.ogg", false, 100);
    }
    async throw(angle: number, pitch: number): Promise<void> {
        this.target?.throw(angle, pitch);
    }
    async pull(): Promise<void> {
        if (this.target) {
            this.target.pull();
            this.ready = false;
            this.target.thrown = false;
            this.target.destroy();
            this.target = null;
        }
    }
}
