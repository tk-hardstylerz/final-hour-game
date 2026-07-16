import PerkMachine from "../../objects/perk_machine";
import Mapobj, { MapObjProperties } from "./mapobj";
import WorldMap from "..";
import Platform from "./platform";
import { MapObjectExport } from "../types";
export interface DoorProperties extends MapObjProperties {
    readonly walltype: string;
    readonly tiletype: string;
    readonly minpoints: number;
    readonly activates?: string;
    readonly open?: boolean;
}
export default class door extends Mapobj<DoorProperties> {
    elementName = "door";
    readonly tiletype: string;
    readonly minpoints: number;
    readonly open: boolean;
    readonly locked: boolean;
    readonly walltype: string;
    readonly activates?: string;
    readonly platform: Platform;
    constructor(map: WorldMap, args: DoorProperties) {
        super(map, args, map.doors);
        this.walltype = args.walltype;
        this.tiletype = args.tiletype;
        this.minpoints = args.minpoints;
        this.activates = args.activates;
        this.open = args.open ?? false;
        if (this.open) {
            if (this.activates) {
                this.map.objects.each((obj) => {
                    if (
                        obj instanceof PerkMachine &&
                        obj.extraName === this.activates
                    ) {
                        obj.activate();
                    }
                });
                for (let spawn_zone of [
                    ...this.map.zomby_spawns,
                    ...this.map.playerSpawns,
                ]) {
                    if (spawn_zone.name === this.activates) {
                        spawn_zone.update({ isActive: true });
                    }
                }
            }
            this.locked = false;
            this.platform = new Platform(map, { ...args, type: this.tiletype });
        } else {
            if (this.activates) {
                for (let spawn_zone of [
                    ...this.map.zomby_spawns,
                    ...this.map.playerSpawns,
                ]) {
                    if (spawn_zone.name === this.activates) {
                        spawn_zone.update({ isActive: false });
                    }
                }
            }
            this.locked = true;
            this.platform = new Platform(map, { ...args, type: this.walltype });
        }
    }
    switch_state(to_open: boolean, locked: boolean): void {
        this.update({ open: to_open });
        this.map.play_unbound("door/open/", this.minx, this.miny, this.minz);
    }
    in_bound(x: number, y: number, z: number): boolean {
        return (
            x >= this.minx - 1 &&
            x < this.maxx + 2 &&
            y >= this.miny - 1 &&
            y < this.maxy + 2 &&
            z >= this.minz - 1 &&
            z < this.maxz + 2
        );
    }
    remove(): void {
        super.remove();
        this.platform.remove();
    }
    update(newProperties: Partial<DoorProperties>): void {
        this.platform.remove();
        return super.update(newProperties);
    }
}
