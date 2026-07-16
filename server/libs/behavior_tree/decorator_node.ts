import Node from "./node";
import { DecoratorNodeParams, NodeState } from "./types";

export default class DecoratorNode extends Node {
    child: Node;
    constructor(args: DecoratorNodeParams) {
        super(args);
        this.child = args.child;
    }
    tick(): NodeState {
        return this.child.tick();
    }
}
