import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";

export default class Interactable extends Mapobj <MapObjProperties>{
    elementName = "interactable";
    constructor(map: WorldMap, args: MapObjProperties) {
        super(map, args, map.interactables);
    }
}
