import Item from "./item";
import Timer from "../timer";
import consts from "../consts";
import Grenade_entity from "../objects/grenade";
import * as Random from "../random";
import Server from "../networking";
import Player from "../objects/player";
export default class Grenade_item extends Item {
    range: number;
    radius: number;
    damage: number;
    entity: Grenade_entity | null;
    constructor(
        server: Server,
        owner: Player,
        amount = 0,
        name = "Grenade",
        description = "a generic grenade",
        range = 15,
        radius = 5,
        damage = 20
    ) {
        super(server, owner, amount, name, description);
        this.range = range;
        this.radius = radius;
        this.damage = damage;
        this.entity = null;
    }
    action_1(): void {
        if (this.owner.dead) return;
        //Lites the fuse of the grenade
        this.owner.speak("You pull the pin from the grenade. ", true);
        this.entity = new Grenade_entity(
            this.server,
            this.owner,
            this.range,
            this.radius,
            this.damage,
            3000,
            Random.random_number(100000000, 999999999).toString(),
            this.owner.map,
            this.owner.x,
            this.owner.y,
            this.owner.z,
            this.owner.game
        );
        this.owner.play_sound("weapons/Fraggrenade/pin.ogg", false, 100);
    }
    async loop() {
        if (this.entity?.exploded) this.entity = null;
    }
}
