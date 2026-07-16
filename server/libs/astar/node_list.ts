import { PriorityQueue } from "./priority_queue";
import PathNode from "./path_node";
import { make_key } from "./utils";
export default class NodeList {
    nodes = new PriorityQueue<PathNode>((a, b) => a.f < b.f);

    add(givenNode: PathNode): void {
        this.nodes.add(givenNode);
    }
    pop(): PathNode | undefined {
        const node = this.nodes.poll();
        return node;
    }

    getNode(givenNode: PathNode): PathNode | undefined {
        const index = this.nodes.indexMap.get(make_key(givenNode)) as number;
        const node = this.nodes.getByIndex(index);
        this.nodes.removeByIndex(index);
        return node;
    }

    hasNode(givenNode: PathNode): boolean {
        return this.nodes.indexMap.has(make_key(givenNode));
    }

    length(): number {
        return this.nodes.size;
    }
}
