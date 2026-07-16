import DecoratorNode from "../decorator_node";
import { NodeState } from "../types";

/// Tick the child up to N times with in each tick, where N is passed as param cycles, as long as the child returns SUCCESS. Return SUCCESS after the N repetitions in the case that the child always returned SUCCESS. Interrupt the loop if the child returns FAILURE and, in that case, return FAILURE too. If the child returns RUNNING, this node returns RUNNING too and the repetitions will continue without incrementing on the next tick of the Repeat node.
export default class Repeat extends DecoratorNode {
    private repeats: number = 0;
    private shouldStopChild: boolean = false;
    tick(): NodeState {
        while (this.repeats < this.getParam<number>("cycles", 1)) {
            const result = this.child.tick();
            this.shouldStopChild = result === NodeState.Running;
            if (result === NodeState.Success) {
                this.repeats++;
            } else if (result === NodeState.Fail) {
                this.repeats = 0;
                return NodeState.Fail;
            } else {
                return NodeState.Running;
            }
        }
        return NodeState.Success;
    }
    stop(): void {
        this.repeats = 0;
        if (this.shouldStopChild) {
            this.child.stop();
            this.shouldStopChild = false;
        }
    }
}
