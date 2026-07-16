import { MapObjProperties } from "./elements/mapobj";
import { PlatformProperties } from "./elements/platform";
import { SoundSourceProperties } from "./elements/sound_source";

export interface MapObjectExport<T extends MapObjProperties> {
    type: string;
    data: T;
}
export interface Bounds {
    minx: number;
    maxx: number;
    miny: number;
    maxy: number;
    minz: number;
    maxz: number;
}
export interface exportedMap extends Bounds {
    elements: MapObjectExport<MapObjProperties>[];
}
