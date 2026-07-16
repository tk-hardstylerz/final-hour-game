import WorldMap from "..";
import Mapobj, { MapObjProperties } from "./mapobj";
export interface SpawnZoneProperties extends MapObjProperties {
    readonly name?: string;
    readonly zBound?: boolean;
    readonly isActive?: boolean;
}
export default abstract class SpawnZone extends Mapobj<SpawnZoneProperties> {
    readonly name?: string;
    readonly isActive: boolean;
    readonly zBound: boolean = false;
    constructor(
        map: WorldMap,
        args: SpawnZoneProperties,
        containingArray?: SpawnZone[]
    ) {
        super(map, args, containingArray);
        this.name = args.name;
        this.isActive = args.isActive ?? !args.name;
        this.zBound = args.zBound ?? false;
    }
}
