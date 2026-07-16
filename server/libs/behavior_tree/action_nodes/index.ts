import { NodeRegistry } from "../types";
import EntityOperations from "./entity_operations";
import BlackboardOperations from "./blackboard_operations";
import Node from "../node";
const actionNodes: NodeRegistry<typeof Node> = {
    ...EntityOperations,
    ...BlackboardOperations,
};
export default actionNodes;
