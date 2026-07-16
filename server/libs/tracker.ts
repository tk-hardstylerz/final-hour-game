import Vector3 from "./astar/vector3";
import Server from "./networking";
import Entity from "./objects/entity";

export interface Point {
    x: number;
    y: number;
    z?: number;
}

export default class Tracker {
    server: Server;
    source: Entity;
    reversed: boolean;
    target: Entity;
    valid_path: boolean;
    path: Point[];
    index: number;
    listener?: (item: Point) => any;
    calculating: boolean = false;
    constructor(
        server: Server,
        source: Entity,
        target: Entity,
        pre_path: Point[] | null = null
    ) {
        this.server = server;
        this.source = source;
        this.reversed = false;
        this.target = target;
        this.valid_path = false;
        this.path = pre_path ?? [];
        this.index = -1;
        this.start_tracking(pre_path ?? undefined);
    }
    at_end() {
        return this.path && this.index >= this.path.length - 1;
    }
    async start_tracking(pre_path: Point[] = []): Promise<void> {
        if (!pre_path) {
            try {
                var path: Point[] = await this.source.map.find_path(
                    Math.trunc(this.source.x),
                    Math.trunc(this.source.y),
                    Math.trunc(this.source.z),
                    Math.trunc(this.target.x),
                    Math.trunc(this.target.y),
                    Math.trunc(this.target.z)
                );
            } catch (err) {
                console.log(err);
                var path: Point[] = [];
            }
        } else {
            var path: Point[] = pre_path;
        }
        if (path && path.length) {
            this.valid_path = true;
            this.path = path;
            var self = this;
            this.listener = (item: Point) => this.add_item(this, item);
            this.target.on("move", this.listener);
        }
    }
    async add_item(self: Tracker, item: Point) {
        if (!self.calculating) {
            self.calculating = true;
            try {
                const path = await this.source.map.find_path(
                    Math.trunc(self.source.x),
                    Math.trunc(self.source.y),
                    Math.trunc(self.source.z),
                    Math.trunc(self.target.x),
                    Math.trunc(self.target.y),
                    Math.trunc(self.target.z)
                );
                if (path.length > 0) {
                    self.path = path;
                    self.index = -1;
                } else {
                    self.path.push({ x: item.x, y: item.y, z: item.z });
                }
            } catch (err) {
                self.path.push({ x: item.x, y: item.y, z: item.z });
            } finally {
                self.calculating = false;
            }
        }
    }
    next() {
        if (this.index < this.path.length - 1) {
            this.index++;
        }
        return this.path[this.index];
    }
    previous() {
        if (this.index > 0) {
            this.index--;
        }
        return this.path[this.index];
    }
    reverse() {
        this.reversed = !this.reversed;
        if (this.listener) this.target.off("move", this.listener);
        var current = this.path[this.index];
        this.path.reverse();
        this.index = this.path.indexOf(current);
    }
    destroy() {
        if (this.listener) this.target.off("move", this.listener);
    }
}
