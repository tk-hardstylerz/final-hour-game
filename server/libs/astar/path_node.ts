import Vector3 from "./vector3";

export default class PathNode {
    parent?: PathNode;
    pos: Vector3;
    g: number;
    h: number;
    f: number;

    constructor(pos: Vector3, g: number, h: number, f: number) {
        this.pos = pos;
        this.h = h;
        this.g = g;
        this.f = f;
    }
}
