export default class Timer {
    start: number;
    paused: boolean;
    pause_elapsed: number;
    constructor() {
        this.start = Date.now();
        this.paused = false;
        this.pause_elapsed = 0;
    }
    get elapsed(): number {
        if (this.paused) {
            return this.pause_elapsed;
        } else {
            return Date.now() - this.start;
        }
    }
    set elapsed(value: number) {
        this.start = value;
    }
    pause(): void {
        this.paused = true;
        this.pause_elapsed = Date.now() - this.start;
    }
    resume(): void {
        this.paused = false;
        this.pause_elapsed = 0;
    }
    restart(): void {
        this.start = Date.now();
    }
}
