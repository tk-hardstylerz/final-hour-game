import EventEmitter from "../event_emitter";
import Server from "../networking";
import Entity from "../objects/entity";
import TickExecutor from "../tick_executor";

export default class Perk extends EventEmitter<Perk> {
    static readonly perkName: string = "empty perk"; // Because the static property `name` is a reserved built-in, so we have to use this name instead.
    static readonly description: string = "Does absolutely nothing";
    readonly server: Server;
    private _currentOwner?: Entity;
    get currentOwner(): Entity | undefined {
        return this._currentOwner;
    }
    constructor(server: Server) {
        super();
        this.server = server;
    }
    async atachTo(newOwner: Entity): Promise<void> {
        if (newOwner != this.currentOwner) {
            this.detachFromCurrentOwner();
            this._currentOwner = newOwner;
            this.emit("atach");
        }
    }
    async detachFromCurrentOwner(): Promise<void> {
        if (this._currentOwner) {
            this.emit("detach");
            this._currentOwner = undefined;
        }
    }
}
