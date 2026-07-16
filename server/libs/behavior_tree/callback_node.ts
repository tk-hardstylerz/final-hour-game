import Node from "./node";
import { NodeParams, NodeState } from "./types";
type CallbackNodeCallback = (self: CallbackNode) => NodeState;

interface CallbackNodeParams extends NodeParams {
    callback: CallbackNodeCallback;
}
export default class CallbackNode extends Node {
    callback: CallbackNodeCallback;
    constructor(args: CallbackNodeParams) {
        super(args);
        this.callback = args.callback;
    }
    tick(): NodeState {
        return this.callback(this);
    }
    static createCallbackNode(
        callback: CallbackNodeCallback
    ): typeof CallbackNode {
        return class extends CallbackNode {
            constructor(args: NodeParams) {
                super({ ...args, callback });
            }
        };
    }
}
