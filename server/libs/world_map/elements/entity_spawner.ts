import WorldMap from "..";
import Game_object from "../../objects/object";
import Mapobj, { MapObjProperties } from "./mapobj";

export default abstract class EntitySpawner<
    T extends MapObjProperties
> extends Mapobj<T> {
    abstract elementName: string;
    entity?: Game_object;
    readonly args: T;
    constructor(map: WorldMap, args: T) {
        super(map, args);
        this.args = args;
        this.initialize();
    }
    remove(): void {
        if (this.entity) this.map.objects.remove(this.entity);
        super.remove();
    }
    update(newProperties: Partial<T>) {
        if (this.entity) this.entity.destroy();
        super.update(newProperties);
    }
    destroy(): void {
        if (this.entity) this.entity.destroy();
        super.destroy();
    }
    abstract initialize(): void;
}
