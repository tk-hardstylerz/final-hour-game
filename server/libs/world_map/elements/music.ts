import WorldMap from "..";
import { MapObjectExport } from "../types";
import Mapobj, { MapObjProperties } from "./mapobj";
import SoundSource, { SoundSourceProperties } from "./sound_source";

export default class Music extends SoundSource {
    elementName = "music";
}
