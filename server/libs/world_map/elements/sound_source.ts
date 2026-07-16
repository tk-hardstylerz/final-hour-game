import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";

export interface SoundSourceProperties extends MapObjProperties {
    readonly sound: string;
    readonly volume?: number;
}
export default class SoundSource extends Mapobj <SoundSourceProperties>{
    elementName = "soundSource";
    readonly sound: string;
    readonly volume: number;
    constructor(map: WorldMap, args: SoundSourceProperties) {
        super(map, args);
        this.sound = args.sound;
        this.volume = args.volume ?? 100;
    }
}
