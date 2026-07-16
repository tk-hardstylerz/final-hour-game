import CallbackNode from "../callback_node";
import Node from "../node";
import { NodeRegistry, NodeState } from "../types";
function compareValues(operator: string, value1: number, value2: number) {
    switch (operator) {
        case "<":
            return value1 < value2;
        case ">":
            return value1 > value2;
        case "==":
            return value1 === value2;
        default:
            return false;
    }
}
const createCallbackNode = CallbackNode.createCallbackNode;
function compare(operator: string): typeof CallbackNode {
    return createCallbackNode((self) => {
        const [value1, value2] = [
            self.getParam("value1", undefined),
            self.getParam("value2", undefined),
        ];
        if (value1 === undefined || value2 === undefined) {
            return NodeState.Fail;
        }
        return compareValues(operator, value1, value2)
            ? NodeState.Success
            : NodeState.Fail;
    });
}

const BasicConditionNodes: NodeRegistry<typeof Node>= {
    isLess: compare("<"),
    isGreater: compare(">"),
    isEqual: compare("=="),
};

export default BasicConditionNodes;
