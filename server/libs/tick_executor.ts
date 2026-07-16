import Server from "./networking";
type TickExecutorCallback = () => Promise<void>;
export enum OnTickExecutorCallbackFail {
    IGNORE,
    CANCELAndLog,
    IgnoreAndLog,
}

export default class TickExecutor {
    private readonly server: Server;
    private readonly callback: TickExecutorCallback;
    private onCallbackFail: OnTickExecutorCallbackFail =
        OnTickExecutorCallbackFail.IgnoreAndLog;
    private isExecuting = false;
    private isStarted = false;
    private onServerTickEvent = (server: Server) => this.onTick(server);
    constructor(
        server: Server,
        callback: TickExecutorCallback,
        onCallbackFail: OnTickExecutorCallbackFail = OnTickExecutorCallbackFail.IgnoreAndLog
    ) {
        this.server = server;
        this.callback = callback;
        this.onCallbackFail = onCallbackFail;
    }
    private async onTick(server: Server): Promise<void> {
        if (!this.isExecuting) {
            try {
                this.isExecuting = true;
                await this.callback();
            } catch (err) {
                switch (this.onCallbackFail) {
                    case OnTickExecutorCallbackFail.CANCELAndLog:
                        this.cancel();
                        console.log(err);
                        break;
                    case OnTickExecutorCallbackFail.IgnoreAndLog:
                        console.log(err);
                        break;
                }
            } finally {
                this.isExecuting = false;
            }
        }
    }
    public start(): void {
        if (!this.isStarted) {
            this.isStarted = true;
            this.isExecuting = false;
            this.server.on("tick", this.onServerTickEvent);
        }
    }
    public cancel(): void {
        if (this.isStarted) {
            this.isStarted = false;
            this.isExecuting = false;
            this.server.off("tick", this.onServerTickEvent);
        }
    }
}
