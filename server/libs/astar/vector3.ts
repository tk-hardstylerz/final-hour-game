export default class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    distance(pos: Vector3): number {
        const dx = pos.x - this.x;
        const dy = pos.y - this.y;
        const dz = pos.z - this.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    euclidean(goalNode: Vector3): number {
        const dx = this.x - goalNode.x;
        const dy = this.y - goalNode.y;
        const dz = this.z - goalNode.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    manhattan(pos: Vector3): number {
        return (
            Math.abs(this.x - pos.x) +
            Math.abs(this.y - pos.y) +
            Math.abs(this.z - pos.z)
        );
    }
    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }
    toString(): string {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}
