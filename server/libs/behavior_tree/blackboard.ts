import Server from "../networking";
import Entity from "../objects/entity";
import Stack from "./stack";
export default class Blackboard {
    server: Server;
    entity: Entity;
    context: Record<string, any> = {};
    stack = new Stack<any>();
    constructor(entity: Entity) {
        this.server = entity.server;
        this.entity = entity;
    }
    getValue(key: string): any | undefined {
        switch (key) {
            // Handle special variables
            case "health":
                return this.entity.hp;
            case "maxHealth":
                return this.entity.maxHp;
            case "dead":
                return this.entity.dead;
            case "x":
                return this.entity.x;
            case "y":
                return this.entity.y;
            case "z":
                return this.entity.z;
        }
        return this.context[key];
    }
    setValue(key: string, value: any) : void{
        this.context[key] = value;
    }
}
