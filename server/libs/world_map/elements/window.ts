import EntitySpawner from "./entity_spawner";
import WindowObject from "../../objects/window";
import { MapObjProperties } from "./mapobj";
export interface WindowProperties extends MapObjProperties {
    readonly hp: number;
}
export default class Window extends EntitySpawner<WindowProperties> {
    elementName = "window";
    initialize(): void {
        this.entity = new WindowObject(
            this.map.server,
            this.map,
            this.minx,
            this.miny,
            this.minz,
            this.args.hp
        );
    }
}
