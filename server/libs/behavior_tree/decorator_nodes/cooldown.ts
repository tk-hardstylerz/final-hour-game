import Timer from "../../timer";
import DecoratorNode from "../decorator_node";
import { NodeState } from "../types";

export default class Cooldown extends DecoratorNode {
    timer = new Timer();
    tick(): NodeState {
        if (this.child.state === NodeState.Running) {
            this.timer.restart();
            return this.child.tick();
        }
        if (this.timer.elapsed >= (this.getParam("time", 0) as number)) {
            this.timer.restart();
            return this.child.tick();
        }
        return NodeState.Fail;
    }
}
