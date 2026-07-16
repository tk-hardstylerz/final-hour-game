import CompositeNode from "../composite_node";
import Node from "../node";
import StatefulNode from "../stateful_node";
import { CompositeNodeParams, NodeState } from "../types";

/// The Sequence node runs its child nodes one after the other. It starts by running the first child node and keeps running each subsequent child node until one of them fails or all of them succeed. If any child node fails, the Sequence node fails immediately. If all child nodes succeed, the Sequence node succeeds. This node is useful when you have a set of tasks that need to be completed in a specific order, and you want to abort the entire process if any single task fails.
export class Sequence extends CompositeNode {
    protected currentChildIndex: number = 0;
    tick(): NodeState {
        const child = this.children[this.currentChildIndex];
        const result = child.tick();
        if (result === NodeState.Success) {
            this.currentChildIndex++;
            if (this.currentChildIndex >= this.children.length) {
                this.currentChildIndex = 0;
                return NodeState.Success;
            }
            return NodeState.Running;
        }
        if (result === NodeState.Fail) {
            this.currentChildIndex = 0;
            return NodeState.Fail;
        }
        return NodeState.Running;
    }
    stopAll(): void {
        for (const node of this.children) {
            node.stop();
        }
    }
}

/// The ReactiveSequence node works similarly to the Sequence node, but with one key difference: if any child node returns a "Running" state, the ReactiveSequence node resets to the beginning and starts over from the first child node. This behavior can be useful in situations where the state of the environment changes dynamically, and you need to re-evaluate the sequence from the beginning based on the new state. If a previous node  changes to fail, any running children will be stopped
export class ReactiveSequence extends Sequence {
    tick(): NodeState {
        const child = this.children[this.currentChildIndex];
        const result = child.tick();
        if (result === NodeState.Success) {
            this.currentChildIndex++;
            if (this.currentChildIndex >= this.children.length) {
                this.currentChildIndex = 0;
                return NodeState.Success;
            }
            return NodeState.Running;
        }
        if (result === NodeState.Fail) {
            this.currentChildIndex = 0;
            this.stopAll();
            return NodeState.Fail;
        } else {
            this.currentChildIndex = 0;
            return NodeState.Running;
        }
    }
}

/// The SequenceWithMemory node is another variation of the Sequence node. Like the Sequence node, it runs through the child nodes one by one. However, if a child node fails, the SequenceWithMemory node does not reset to the beginning. Instead, it remembers the last successfully completed child node and starts from there the next time it runs. This can be useful when you want to maintain progress through a sequence of tasks, even if one of the tasks fails temporarily.
export class SequenceWithMemory extends Sequence {
    tick(): NodeState {
        const child = this.children[this.currentChildIndex];
        const result = child.tick();
        if (result === NodeState.Success) {
            this.currentChildIndex++;
            if (this.currentChildIndex >= this.children.length) {
                this.currentChildIndex = 0;
                return NodeState.Success;
            }
            return NodeState.Running;
        }
        if (result === NodeState.Fail) {
            return NodeState.Fail;
        }
        return NodeState.Running;
    }
}
