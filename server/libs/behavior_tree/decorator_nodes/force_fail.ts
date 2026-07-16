import DecoratorNode from "../decorator_node";
import { NodeState } from "../types";

/// If the child returns RUNNING, this node returns RUNNING too. Otherwise it always returns fail
export default class ForceFail extends DecoratorNode {
    tick(): NodeState {
        const result = this.child.tick();
        if (result === NodeState.Running) {
            return NodeState.Running;
        }
        return NodeState.Fail;
    }
}
