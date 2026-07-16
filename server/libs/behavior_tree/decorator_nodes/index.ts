import DecoratorNode from "../decorator_node";
import { NodeRegistry } from "../types";
import Cooldown from "./cooldown";
import ForceFail from "./force_fail";
import ForceSuccess from "./force_success";
import Invert from "./invert";
import Repeat from "./repeat";
const DecoratorNodes: NodeRegistry<typeof DecoratorNode>= {
    cooldown: Cooldown,
    forceFail: ForceFail,
    forceSuccess: ForceSuccess,
    invert: Invert,
    repeat: Repeat,
};
export default DecoratorNodes;
