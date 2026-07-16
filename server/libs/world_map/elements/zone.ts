import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";

export default class Zone extends Mapobj <MapObjProperties>{
    elementName = "zone";
    text: string;
    constructor(map: WorldMap, args: MapObjProperties) {
        super(map, args);
        this.text = args.innerText ?? "";
    }
}
