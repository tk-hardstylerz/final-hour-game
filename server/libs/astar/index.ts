import PathNode from "./path_node";
import NodeList from "./node_list";
import Vector3 from "./vector3";
import WorldMap from "../world_map";
import timer from "../timer";
import { make_key } from "./utils";
function sleep(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}
export default class AStar {
    map: WorldMap;
    mapSize: {
        x: { min: number; max: number };
        y: { min: number; max: number };
        z: { min: number; max: number };
    };
    getTile: (map: WorldMap, x: number, y: number, z: number) => boolean;
    constructor(
        map: WorldMap,
        sizeX: { min: number; max: number },
        sizeY: { min: number; max: number },
        sizeZ: { min: number; max: number },
        getTile: (map: WorldMap, x: number, y: number, z: number) => boolean
    ) {
        this.map = map;
        this.mapSize = { x: sizeX, y: sizeY, z: sizeZ };
        this.getTile = getTile;
    }
    async path(
        startX: number,
        startY: number,
        startZ: number,
        endX: number,
        endY: number,
        endZ: number,
        { timeout = 50 }
    ): Promise<Vector3[]> {
        const x_array = [0, -1, -1, -1, 0, 1, 1, 1, 0, 0]; // Including diagonal movements and no x movement for climbing
        const y_array = [1, 1, 0, -1, -1, -1, 0, 1, 0, 0]; // Including diagonal movements and no y movement for climbing
        const z_array = [0, 0, 0, 0, 0, 0, 0, 0, -1, 1]; // Including diagonal z movement for climbing, 0 for horizontal movement
        const stop_timer = new timer();
        if (
            !this.map.in_bound(startX, startY, startZ) ||
            !this.map.in_bound(endX, endY, endZ) ||
            this.getTile(this.map, endX, endY, endZ) ||
            this.getTile(this.map, startX, startY, startZ)
        ) {
            return [];
        }
        const start = new Vector3(startX, startY, startZ);
        const goal = new Vector3(endX, endY, endZ);
        const open_list = new NodeList();
        open_list.add(
            new PathNode(
                start,
                start.euclidean(goal) * 10,
                0,
                start.euclidean(goal) * 10
            )
        );
        const closed_set = new Set<string>();
        let count = 0;
        while (open_list.length() > 0) {
            count++;
            if (stop_timer.elapsed >= timeout) {
                return [];
            }
            if (count % 50 === 0) await sleep();
            const currentNode = open_list.pop();
            if (!currentNode) break;
            closed_set.add(make_key(currentNode));
            if (
                currentNode.pos.x === goal.x &&
                currentNode.pos.y === goal.y &&
                currentNode.pos.z === goal.z
            ) {
                const finalPath: Vector3[] = [];
                let curNode: PathNode | undefined = currentNode;
                while (
                    curNode &&
                    !(
                        curNode.pos.x === start.x &&
                        curNode.pos.y === start.y &&
                        curNode.pos.z === start.z
                    )
                ) {
                    finalPath.push(curNode.pos);
                    curNode = curNode?.parent;
                }
                return finalPath.reverse();
            }
            for (let i = 0; i < 10; i++) {
                const neighborPos = new Vector3(
                    currentNode.pos.x + x_array[i],
                    currentNode.pos.y + y_array[i],
                    currentNode.pos.z + z_array[i]
                );
                const neighbor = new PathNode(neighborPos, 0, 0, 0);

                if (
                    neighbor.pos.x < this.mapSize.x.min ||
                    neighbor.pos.y < this.mapSize.y.min ||
                    neighbor.pos.z < this.mapSize.z.min ||
                    neighbor.pos.x > this.mapSize.x.max ||
                    neighbor.pos.y > this.mapSize.y.max ||
                    neighbor.pos.z > this.mapSize.z.max
                ) {
                    continue;
                }

                if (
                    closed_set.has(make_key(neighbor)) ||
                    this.getTile(
                        this.map,
                        neighbor.pos.x,
                        neighbor.pos.y,
                        neighbor.pos.z
                    )
                ) {
                    continue;
                }

                const distanceToTile = 10;

                if (open_list.hasNode(neighbor)) {
                    const existingNeighbor = open_list.getNode(neighbor);
                    const newG = currentNode.g + distanceToTile;
                    if (existingNeighbor && existingNeighbor.g > newG) {
                        existingNeighbor.parent = currentNode;
                        existingNeighbor.g = currentNode.g + distanceToTile;
                        existingNeighbor.h = neighbor.pos.euclidean(goal) * 10;
                        existingNeighbor.f =
                            existingNeighbor.g + existingNeighbor.h;
                    }
                    if (existingNeighbor) open_list.add(existingNeighbor);
                } else {
                    neighbor.parent = currentNode;
                    neighbor.g = currentNode.g + distanceToTile;
                    neighbor.h = neighbor.pos.euclidean(goal) * 10; // Calculate h afresh
                    neighbor.f = neighbor.g + neighbor.h; // Calculate f afresh
                    open_list.add(neighbor);
                }
            }
        }
        return [];
    }
}
