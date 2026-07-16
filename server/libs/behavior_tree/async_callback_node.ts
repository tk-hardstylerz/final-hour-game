import Node from "./node";
import { NodeParams, NodeState } from "./types";

type AsyncCallbackNodeCallback = (self: AsyncCallbackNode) => Promise<void>;

export interface AsyncCallbackNodeParams extends NodeParams {
    callback: AsyncCallbackNodeCallback;
}
enum PromiseState {
    Pending,
    Complete,
    Rejected,
}
class AsyncCallbackNode extends Node {
    private callback: AsyncCallbackNodeCallback;
    private promiseState: PromiseState = PromiseState.Pending;
    private currentRun: number = 0;
    constructor(args: AsyncCallbackNodeParams) {
        super(args);
        this.callback = args.callback;
    }
    onRun(): NodeState {
        const currentRun = ++this.currentRun;
        this.promiseState = PromiseState.Pending;
        this.callback(this)
            .then(() => {
                if (currentRun === this.currentRun) {
                    this.promiseState = PromiseState.Complete;
                }
            })
            .catch(() => {
                if (currentRun === this.currentRun) {
                    this.promiseState = PromiseState.Rejected;
                }
            });
        return NodeState.Running;
    }
    onRunning(): NodeState {
        switch (this.promiseState) {
            case PromiseState.Pending:
                return NodeState.Running;
            case PromiseState.Complete:
                return NodeState.Success;
            case PromiseState.Rejected:
                return NodeState.Fail;
        }
    }
    onStop(): void {
        this.promiseState = PromiseState.Pending;
    }
    static createAsyncCallbackNode(
        callback: AsyncCallbackNodeCallback
    ): typeof AsyncCallbackNode {
        return class extends AsyncCallbackNode {
            constructor(args: NodeParams) {
                super({ ...args, callback });
            }
        };
    }
}
