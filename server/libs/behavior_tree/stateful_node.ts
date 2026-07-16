import Node from "./node";
import { NodeState } from "./types";

export default class StatefulNode extends Node {
    onRun(): NodeState {
        return NodeState.Fail;
    }
    onRunning(): NodeState {
        return NodeState.Fail;
    }
    onStop(): void {
        this.state = NodeState.Idel;
    }
    tick(): NodeState {
        let result: NodeState;
        if (this.state === NodeState.Running) {
            result = this.onRunning();
        } else {
            result = this.onRun();
        }
        switch (result) {
            case NodeState.Success:
            case NodeState.Fail:
                this.state = NodeState.Idel;
                return result;
            case NodeState.Running:
                this.state = NodeState.Running;
                break;
        }
        return NodeState.Running;
    }
    stop(): void {
        if (this.state === NodeState.Running) {
            return this.onStop();
        }
    }
}
