import { ReadableStreamBYOBRequest } from "stream/web";
import Entity from "./objects/entity";

function degrees(rad: number): number {
    return (rad * 180) / Math.PI;
}
function radians(deg: number): number {
    return (deg * Math.PI) / 180.0;
}
function round(value: number, precision: number): number {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}
/*see the client-side movement module. this is just a  js version of it*/

function to_int(val: string): number {
    var res = parseInt(val);
    return res || 0;
}

const east = 90;
const northeast = 45;
const north = 0;
const northwest = 315;
const west = 270;
const southwest = 225;
const south = 180;
const southeast = 135;
const strayght_up = 90;
const strayght_down = -90;

class Vector {
    x: number;
    y: number;
    z: number;
    constructor(x = 0.0, y = 0.0, z = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    get_coords(): number[] {
        return [this.x, this.y, this.z];
    }
    set_coords(coords: number[]): void {
        this.x = coords[0];
        this.y = coords[1];
        this.z = coords[2];
    }
    get get_tuple(): number[] {
        return [round(this.x, 1), round(this.y, 1), round(this.z, 1)];
    }
}

export function move(
    coords: number[],
    deg: number,
    pitch = 0.0,
    factor = 1.0
): Vector {
    const x = coords[0];
    const y = coords[1];
    const z = coords[2];
    const steplength = factor * Math.cos(radians(pitch));
    const r = new Vector();
    r.x = x + steplength * Math.sin(radians(deg));
    r.y = y + steplength * Math.cos(radians(deg));
    r.z = z + factor * Math.sin(radians(pitch));
    return r;
}
export function calculate_angle(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
    deg: number
): number {
    var x = x2 - x1;
    var y = y2 - y1;
    var z = z2 - z1;
    if (x === 0) {
        if (y >= 0) {
            return 0;
        } else {
            return 180;
        }
    }
    var rad = Math.atan2(y, x);
    var arc_tan = degrees(rad);
    var fdeg = x > 0 || x < 0 ? 270 - arc_tan : 0;
    fdeg -= deg;
    fdeg = fdeg % 360;
    return fdeg;
}

export function get_distance(
    ref_point: { x: number; y: number; z: number },
    check_point: { x: number; y: number; z: number }
): number {
    var dx =
        Math.max(ref_point.x, check_point.x) -
        Math.min(ref_point.x, check_point.x);
    var dy =
        Math.max(ref_point.y, check_point.y) -
        Math.min(ref_point.y, check_point.y);
    var dz =
        Math.max(ref_point.z, check_point.z) -
        Math.min(ref_point.z, check_point.z);
    return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
}
