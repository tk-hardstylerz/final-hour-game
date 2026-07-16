import Node from "./node";
import { CompositeNodeParams } from "./types";

export default class CompositeNode extends Node {
    children: Node[];
    constructor(args: CompositeNodeParams) {
        super(args);
        this.children = args.children;
    }
}
