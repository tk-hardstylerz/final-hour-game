import WorldMap from "..";
import SpawnZone, { SpawnZoneProperties } from "./spawn_zone";

export default class PlayerSpawnZone extends SpawnZone {
    elementName = "playerSpawn";
    constructor(map: WorldMap, args: SpawnZoneProperties) {
        super(map, args, map.playerSpawns);
    }
}
