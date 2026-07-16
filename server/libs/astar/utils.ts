import PathNode from "./path_node";

export function make_key(node: PathNode): string {
    return `${node.pos.x};${node.pos.y};${node.pos.z}`;
}

