import CallbackNode from "../callback_node";
import Node from "../node";
import { NodeRegistry, NodeState } from "../types";
const createCallbackNode = CallbackNode.createCallbackNode;
const EntityOperations: NodeRegistry<typeof Node>= {
    playSound: createCallbackNode((self) => {
        self.entity.play_sound(
            self.getParam("sound", ""),
            self.getParam("looping", false),
            self.getParam("volume", 100),
            self.getParam("streaming", false),
            self.getParam("excludeMe", false),
            self.getParam("global", false),
            self.getParam("id", undefined),
            self.getParam("distPath", undefined)
        );
        return NodeState.Success;
    }),
    moveOnce: createCallbackNode((self) => {
        const [x, y, z] = [
            self.getParam("x", self.entity.x),
            self.getParam("y", self.entity.y),
            self.getParam("z", self.entity.z),
        ];
        if (self.entity.map.is_unwalkable(self.entity.map, x, y, z)) {
            return NodeState.Fail;
        }
        self.entity.move(
            x,
            y,
            z,
            self.getParam("playSound", false),
            self.getParam("mode", "walking"),
            self.getParam("excludeMe", false)
        );
        return NodeState.Success;
    }),
    changeMap: createCallbackNode((self) => {
        const mapName = self.getParam("map", "");
        if (!(mapName in self.server.maps)) {
            return NodeState.Fail;
        }
        self.entity.change_map(
            self.server.maps[mapName],
            self.getParam("x", undefined),
            self.getParam("y", undefined),
            self.getParam("z", undefined)
        );
        return NodeState.Success;
    }),
    emitEvent: createCallbackNode((self) => {
        const event = self.getParam("event", "");
        if (event) {
            self.entity.emit(event);
            return NodeState.Success;
        }
        return NodeState.Fail;
    }),
};
export default EntityOperations;
