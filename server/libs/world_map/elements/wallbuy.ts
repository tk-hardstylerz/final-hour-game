import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";
export interface WallbuyProperties extends MapObjProperties {
    readonly weaponName: string;
    readonly weaponCost: number;
    readonly ammoCost: number;
}
export default class Wallbuy extends Mapobj<WallbuyProperties> {
    elementName = "wallbuy";
    readonly weaponName: string;
    readonly weaponCost: number;
    readonly ammoCost: number;
    constructor(map: WorldMap, args: WallbuyProperties) {
        super(map, args, map.wallbuys);
        this.weaponName = args.weaponName;
        this.weaponCost = args.weaponCost;
        this.ammoCost = args.ammoCost;
    }
    in_bound(x: number, y: number, z: number): boolean {
        return (
            x >= this.minx - 1 &&
            x <= this.maxx + 1 &&
            y >= this.miny - 1 &&
            y <= this.maxy + 1 &&
            z >= this.minz - 1 &&
            z <= this.maxz + 1
        );
    }
}
