import CallbackNode from "../callback_node";
import Node from "../node";
import { NodeRegistry, NodeState } from "../types";
const createCallbackNode = CallbackNode.createCallbackNode;
const BlackboardOperations: NodeRegistry<typeof Node>= {
    push: createCallbackNode((self) => {
        const value = self.getParam("value", undefined);
        if (!value) {
            return NodeState.Fail;
        }
        self.blackboard.stack.push(value);
        return NodeState.Success;
    }),
    pop: createCallbackNode((self) => {
        const value = self.blackboard.stack.pop();
        const to = self.getParam("to", undefined);
        if (to) {
            self.blackboard.context[to] = value;
        }
        return NodeState.Success;
    }),
    clearStack: createCallbackNode((self) => {
        self.blackboard.stack.clear();
        return NodeState.Success;
    }),
    set: createCallbackNode((self) => {
        const key = self.getParam("key", undefined);
        const value = self.getParam("value", undefined);
        if (!key || value === undefined) {
            return NodeState.Fail;
        }
        self.blackboard.setValue(key,  value);
        return NodeState.Success;
    }),
    clearContext: createCallbackNode((self) => {
        self.blackboard.context = {};
        return NodeState.Success;
    }),
};
export default BlackboardOperations;
