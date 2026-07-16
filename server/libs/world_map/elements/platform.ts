import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";

export interface PlatformProperties extends MapObjProperties {
    readonly type: string;
}
export default class Platform extends Mapobj<PlatformProperties> {
    elementName = "platform";
    readonly type: string;
    constructor(map: WorldMap, args: PlatformProperties) {
        super(map, args, map.platforms);
        this.type = args.type;
    }
    export(): MapObjectExport<MapObjProperties> {
        return this.makeExport();
    }
}
