import EntitySpawner from "./entity_spawner";
import PowerSwitchObject from "../../objects/power_switch";
import { MapObjProperties } from "./mapobj";
export interface PowerSwitchProperties extends MapObjProperties {
    readonly cost: number;
}
export default class PowerSwitch extends EntitySpawner<PowerSwitchProperties> {
    elementName = "window";
    initialize(): void {
        this.entity = new PowerSwitchObject(this.map.server, {
            map: this.map,
            x: this.minx,
            y: this.miny,
            z: this.minz,
            cost: this.args.cost,
        });
    }
}
