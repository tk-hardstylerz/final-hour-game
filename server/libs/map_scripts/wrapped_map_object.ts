import EventEmitter from "../event_emitter";
import Game_object from "../objects/object";
import Mapobj, { MapObjProperties } from "../world_map/elements/mapobj";

export interface WrappedMapObjectInterface extends MapObjProperties {
    readonly inBound: (x: number, y: number, z: number) => boolean;
    readonly intersects: (other: {
        minx: number;
        maxx: number;
        maxy: number;
        miny: number;
        maxz: number;
        minz: number;
    }) => boolean;
    readonly remove: () => void;
    readonly destroy: () => void;
    readonly update: (newProperties: Partial<MapObjProperties>) => any;
    readonly events: EventEmitter<Game_object>;
}

export default function WrappedWorldMapObject(
    self: Mapobj<MapObjProperties>
): WrappedMapObjectInterface {
    return {
        inBound: self.in_bound.bind(self),
        intersects: self.intersects.bind(self),
        remove: self.remove.bind(self),
        destroy: self.destroy.bind(self),
        update: self.update.bind(self),
        events: self.events,
        ...self.properties,
    };
}
