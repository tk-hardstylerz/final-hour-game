import Server from "../networking";
import Entity from "../objects/entity";
import Blackboard from "./blackboard";
import Stack from "./stack";
import { BlackboardValueType, NodeParams, NodeState } from "./types";

export default class Node {
    server: Server;
    blackboard: Blackboard;
    id?: string;
    state: NodeState = NodeState.Idel;
    entity: Entity;
    params: Record<string, number | boolean | string | null | undefined> = {};
    constructor(args: NodeParams) {
        this.server = args.blackboard.server;
        this.blackboard = args.blackboard;
        this.entity = args.blackboard.entity;
        this.id = args.id;
        this.params = args.params ?? {};
    }
    tick(): NodeState {
        return NodeState.Fail;
    }
    getParam<T>(key: string, _default: T): T {
        let value = this.params[key];
        if (typeof value === "string" && value.startsWith("$")) {
            const lookupKey = value.replace("$", "");
            value = this.blackboard.getValue(lookupKey);
        }
        return (value ?? _default) as T;
    }
    stop(): void {}
}
