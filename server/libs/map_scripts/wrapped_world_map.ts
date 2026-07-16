import WorldMap, { EntityQuery } from "../world_map";
import { WrappedEntityInterface } from "./wrapped_entity";
import { Bounds } from "../world_map/types";
import EventEmitter from "../event_emitter";
import WrappedWorldMapObject, {
    WrappedMapObjectInterface,
} from "./wrapped_map_object";
export interface WrappedWorldMapInterface {
    readonly bounds: Bounds;
    speak: (
        text: string,
        interupt?: boolean,
        buffer?: string,
        sound?: string,
        excludes?: string[]
    ) => void;
    getZombieSpawn: () => {
        x: number;
        y: number;
        z: number;
    };
    getPlayerSpawn: () => {
        x: number;
        y: number;
        z: number;
    };
    playUnbound: (
        sound: string,
        x: number,
        y: number,
        z: number,
        volume?: number,
        streaming?: boolean
    ) => void;
    readonly entities: WrappedEntityInterface[];
    readonly players: WrappedEntityInterface[];
    getEntitiesIn(
        query: EntityQuery,
        includePlayers?: boolean,
        excludeUnhittables?: boolean
    ): WrappedEntityInterface[];
    readonly events: EventEmitter<WrappedEntityInterface>;
    readonly getElementById: (id: string) => WrappedMapObjectInterface|undefined;
}

export default function WrappedWorldMap(
    self: WorldMap
): WrappedWorldMapInterface {
    return {
        get bounds(): Bounds {
            return {
                minx: self.minx,
                maxx: self.maxx,
                miny: self.miny,
                maxy: self.maxy,
                minz: self.minz,
                maxz: self.maxz,
            };
        },
        speak: self.speak.bind(self),
        getZombieSpawn: self.get_zomby_spawn.bind(self),
        getPlayerSpawn: self.get_player_spawn.bind(self),
        playUnbound: self.play_unbound.bind(self),
        get entities() {
            const allEntities: WrappedEntityInterface[] = [];
            self.objects.each((entity) => allEntities.push(entity.wrapped));
            return allEntities;
        },
        get players() {
            const allPlayers: WrappedEntityInterface[] = [];
            self.playersQuadtree.each((entity) =>
                allPlayers.push(entity.wrapped)
            );
            return allPlayers;
        },
        getEntitiesIn(
            query: EntityQuery,
            includePlayers = true,
            excludeUnhittables = true
        ) {
            return self
                .get_objects_at(query, includePlayers, excludeUnhittables)
                .map((entity) => entity.wrapped);
        },
        get events() {
            return self.wrappedEvents;
        },
        getElementById(id) {
            const result = self.allElementsIds.get(id);
            if (result) return WrappedWorldMapObject(result);
        },
    };
}
