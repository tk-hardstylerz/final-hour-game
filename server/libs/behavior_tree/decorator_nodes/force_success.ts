import DecoratorNode from "../decorator_node";
import { NodeState } from "../types";

/// If the child returns RUNNING, this node returns RUNNING too. Otherwise it always returns success
export default class ForceSuccess extends DecoratorNode {
    tick(): NodeState {
        const result = this.child.tick();
        if (result === NodeState.Running) {
            return NodeState.Running;
        }
        return NodeState.Success;
    }
}
