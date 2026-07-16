import Node from "../node";
import { NodeRegistry } from "../types";
import BasicConditionNodes from "./basic_conditions";
const conditionNodes: NodeRegistry<typeof Node>= {
    ...BasicConditionNodes,
};
export default conditionNodes