import EntitySpawner from "./entity_spawner";
import { MapObjProperties } from "./mapobj";
import PerkMachineObject from "../../objects/perk_machine";

export interface PerkMachineProperties extends MapObjProperties {
    readonly perk: string;
    readonly quantity?: number;
    readonly price?: number;
    readonly allowDuplicate?: boolean;
    readonly sound?: string;
    readonly name?: string;
}
export default class PerkMachine extends EntitySpawner<PerkMachineProperties> {
    elementName = "perkMachine";
    initialize(): void {
        this.entity = new PerkMachineObject(this.map.server, {
            map: this.map,
            x: this.minx,
            y: this.miny,
            z: this.minz,
            ...this.args,
        });
    }
}
