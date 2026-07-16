import DecoratorNode from "../decorator_node";
import { NodeState } from "../types";

/// Tick the child once and return SUCCESS if the child failed or FAILURE if the child succeeded. If the child returns RUNNING, this node returns RUNNING too.
export default class Invert extends DecoratorNode {
    tick(): NodeState {
        const result = this.child.tick();
        switch (result) {
            case NodeState.Success:
                return NodeState.Fail;
            case NodeState.Fail:
                return NodeState.Success;
        }
        return result;
    }
}
