import WorldMap from "..";
import SpawnZone, { SpawnZoneProperties } from "./spawn_zone";

export default class ZombieSpawnZone extends SpawnZone {
    elementName = "zombieSpawn";
    constructor(map: WorldMap, args: SpawnZoneProperties) {
        super(map, args, map.zomby_spawns);
    }
}
