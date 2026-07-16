import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";

export interface ReverbProperties extends MapObjProperties {
    readonly decayTime?: number;
    readonly density?: number;
    readonly diffusion?: number;
    readonly gain?: number;
    readonly gainhf?: number;
    readonly gainlf?: number;
    readonly hfratio?: number;
    readonly lfratio?: number;
    readonly reflectionsGain?: number;
    readonly reflectionsDelay?: number;
    readonly reflectionsPan?: [number, number, number];
    readonly lateReverbGain?: number;
    readonly lateReverbDelay?: number;
    readonly lateReverbPan?: [number, number, number];
    readonly echoTime?: number;
    readonly echoDepth?: number;
    readonly modulationTime?: number;
    readonly modulationDepth?: number;
    readonly airAbsorptionGainhf?: number;
    readonly hfrefference?: number;
    readonly lfrefference?: number;
    readonly roomRolloffFactor?: number;
}
export class Reverb extends Mapobj<ReverbProperties> {
    elementName = "reverb";
    readonly properties: ReverbProperties;
    constructor(map: WorldMap, args: ReverbProperties) {
        super(map, args);
        this.properties = args;
    }
    export(): MapObjectExport<MapObjProperties> {
        return this.makeExport();
    }
}
