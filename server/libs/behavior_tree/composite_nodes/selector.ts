import CompositeNode from "../composite_node";
import Node from "../node";
import StatefulNode from "../stateful_node";
import { CompositeNodeParams, NodeState } from "../types";

/// The Selector node runs its child nodes sequentially until one of them succeeds. If a child succeeds, the selector node succeeds. If a child fails, move on to next child. If all children fail, the selector node fails. If a child is running, the selector node keeps running until that child finishes.
export class Selector extends CompositeNode{
    protected currentChildIndex: number = 0;
    tick(): NodeState {
        const child = this.children[this.currentChildIndex];
        const result = child.tick();
        if (result === NodeState.Success) {
            return NodeState.Success;
        } else if (result === NodeState.Fail) {
            this.currentChildIndex++;
            if (this.currentChildIndex >= this.children.length) {
                this.currentChildIndex = 0;
                return NodeState.Fail;
            }
            return NodeState.Running;
        }
        return NodeState.Running;
    }
    stopAll(): void {
        for (const node of this.children) {
            node.stop();
        }
    }
}

/// The ReactiveSelector node is similar to the Selector node, but if any child node returns a "Running" state, the ReactiveSelector node resets to the beginning and starts over from the first child node. if one of the previous Conditions changes its state from FAILURE to SUCCESS, any `running` nodes are stopped.
export class ReactiveSelector extends Selector {
    tick(): NodeState {
        const child = this.children[this.currentChildIndex];
        const result = child.tick();
        if (result === NodeState.Success) {
            this.stopAll();
            return NodeState.Success;
        } else if (result === NodeState.Fail) {
            this.currentChildIndex++;
            if (this.currentChildIndex >= this.children.length) {
                this.currentChildIndex = 0;
                return NodeState.Fail;
            }
            return NodeState.Running;
        }
        this.currentChildIndex = 0;
        return NodeState.Running;
    }
}
