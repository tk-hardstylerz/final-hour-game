import Server from "../networking";
import Entity from "../objects/entity";
import Blackboard from "./blackboard";
import Node from "./node";
import Stack from "./stack";

export type BlackboardValueType = string | number;
export interface NodeParams {
    blackboard: Blackboard;
    id?: string;
    params?: Record<string, string | number | boolean | null | undefined>;
}
export interface CompositeNodeParams extends NodeParams {
    children: Node[];
}
export interface DecoratorNodeParams extends NodeParams {
    child: Node;
}
export enum NodeState {
    Success,
    Fail,
    Running,
    Idel,
}
export interface NodeRegistry<T extends typeof Node>{
    [key: string]: T;
}
