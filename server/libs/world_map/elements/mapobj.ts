import WorldMap from "..";
import EventEmitter from "../../event_emitter";
import Game_object from "../../objects/object";
import { MapObjectExport } from "../types";

export interface MapObjProperties {
    readonly minx: number;
    readonly maxx: number;
    readonly miny: number;
    readonly maxy: number;
    readonly minz: number;
    readonly maxz: number;
    readonly id: string;
    readonly _class?: string;
    readonly innerText?: string;
    readonly markedForRebuild?: boolean;
}
export default class Mapobj<T extends MapObjProperties> {
    readonly elementName: string = "mapobj";
    readonly minx: number;
    readonly maxx: number;
    readonly miny: number;
    readonly maxy: number;
    readonly minz: number;
    readonly maxz: number;
    readonly map: WorldMap;
    readonly containingArray?: Mapobj<T>[];
    readonly id: string;
    readonly _class: string;
    readonly properties: T;
    readonly events = new EventEmitter<Game_object>();
    markedForRebuild: boolean;
    constructor(map: WorldMap, args: T, containingArray?: Mapobj<T>[]) {
        this.minx = args.minx;
        this.maxx = args.maxx;
        this.miny = args.miny;
        this.maxy = args.maxy;
        this.minz = args.minz;
        this.maxz = args.maxz;
        this.map = map;
        this.containingArray = containingArray;
        this.id = args.id;
        this._class = args._class ?? "";
        this.properties = args;
        this.markedForRebuild = args.markedForRebuild ?? false;
        map.allElementsIds.set(this.id, this);
        if (this.markedForRebuild) {
            this.map.rebuiltElements.push(this);
        } else {
            map.allElements.push(this);
            this.containingArray?.push(this);
        }
    }
    in_bound(x: number, y: number, z: number): boolean {
        return (
            x >= this.minx &&
            x <= this.maxx &&
            y >= this.miny &&
            y <= this.maxy &&
            z >= this.minz &&
            z <= this.maxz
        );
    }
    intersects(other: {
        minx: number;
        maxx: number;
        maxy: number;
        miny: number;
        maxz: number;
        minz: number;
    }): boolean {
        return !(
            other.minx > this.maxx ||
            other.maxx < this.minx ||
            other.maxy < this.miny ||
            other.miny > this.maxy ||
            other.maxz < this.minz ||
            other.minz > this.maxz
        );
    }
    // to remove an element from its map
    remove(): void {
        let index = this.map.allElements.indexOf(this);
        if (index !== -1) {
            this.map.allElements.splice(index, 1);
        }
        if (this.containingArray) {
            let index = this.containingArray.indexOf(this);
            if (index !== -1) {
                this.containingArray.splice(index, 1);
            }
        }
    }
    destroy(): void {
        this.remove();
    }
    protected makeExport(): MapObjectExport<MapObjProperties> {
        return {
            type: this.elementName,
            data: {
                ...this.properties,
            },
        };
    }
    export(): MapObjectExport<MapObjProperties> {
        return this.makeExport();
    }
    update(newProperties: Partial<T>) {
        const updatedProps: T = {
            ...this.properties,
            ...newProperties,
            markedForRebuild: true,
        };
        // The following assignment is ugly and completely vialates typescript's type safety, and I hated every second of writing it, but it's the only way.
        // The problem is that we need to create a new instance of the same class that we're in, but we can't just use the `new` keyword because that would create a new instance of the base class `Mapobj`, which is not what we want. We want to create a new instance of the derived class that `this` belongs to, because in most cases this will be one of the child classes of mapObj.
        // So we have to resort to this hacky workaround which is basically saying "give me the constructor function of the object that `this` was created from."
        const updatedInstance = new (Object.getPrototypeOf(this).constructor)(
            this.map,
            updatedProps,
            this.containingArray
        );
        let index = this.map.allElements.indexOf(this);
        if (index !== -1) {
            this.map.allElements[index] = updatedInstance;
        }
        if (this.containingArray) {
            let index = this.containingArray.indexOf(this);
            if (index !== -1) {
                this.containingArray[index] = updatedInstance;
            }
        }
        return updatedInstance;
    }
}
