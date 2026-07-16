/**
 * the original code is licensed under the Apache License, Version 2.0.
 * The original code is from https://github.com/ddurschlag6river/TypedPriorityQueue
 * Modified
 */

import PathNode from "./path_node";
import { make_key } from "./utils";

// the provided comparator function should take a, b and return *true* when a < b
export class PriorityQueue<T extends PathNode> {
    private array: T[];
    private _size: number;
    private compare: (a: T, b: T) => boolean;
    public get size(): number {
        return this._size;
    }
    public indexMap: Map<string, number>;
    constructor(comparator: (a: any, b: any) => boolean) {
        this.array = [];
        this._size = 0;
        this.compare = comparator || PriorityQueue.defaultcomparator;
        this.indexMap = new Map();
    }

    private static defaultcomparator<T>(a: T, b: T) {
        return a < b;
    }

    // Add an element the the queue
    // runs in O(log n) time
    public add(myval: T) {
        var i = this._size;
        this.array[this._size] = myval;
        this.indexMap.set(make_key(myval), i);
        this._size += 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            const ap = this.array[p];
            if (!this.compare(myval, ap)) {
                break;
            }
            this.array[i] = ap;
            this.indexMap.set(make_key(ap), i);
            i = p;
        }
        this.array[i] = myval;
        this.indexMap.set(make_key(myval), i);
    }

    // for internal use
    private _percolateUp(i: number, force = false) {
        var myval = this.array[i];
        while (i > 0) {
            const p = (i - 1) >> 1;
            const ap = this.array[p];
            if (!force && !this.compare(myval, ap)) {
                break;
            }
            this.array[i] = ap;
            this.indexMap.set(make_key(ap), i);
            i = p;
        }
        this.array[i] = myval;
        this.indexMap.set(make_key(myval), i);
    }

    // for internal use
    private _percolateDown(i: number) {
        var size = this._size;
        var hsize = this._size >>> 1;
        var ai = this.array[i];
        while (i < hsize) {
            let l = (i << 1) + 1;
            const r = l + 1;
            let bestc = this.array[l];
            if (r < size) {
                if (this.compare(this.array[r], bestc)) {
                    l = r;
                    bestc = this.array[r];
                }
            }
            if (!this.compare(bestc, ai)) {
                break;
            }
            this.array[i] = bestc;
            this.indexMap.set(make_key(bestc), i);
            i = l;
        }
        this.array[i] = ai;
        this.indexMap.set(make_key(ai), i);
    }
    // removes the item at the given index from the queue,
    // retaining balance. returns the removed item, or undefined if nothing is removed.
    public removeByIndex(index: number): T | undefined {
        if (index > this._size - 1 || index < 0) return undefined;
        this._percolateUp(index, true);
        return this.poll();
    }
    // Get element by index
    public getByIndex(index: number): T | undefined {
        if (index < 0 || index >= this._size) return;
        return this.array[index];
    }

    // Look at the top of the queue (a smallest element)
    // executes in constant time
    //
    // Calling peek on an empty priority queue returns
    // the "undefined" value.
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
    //
    public peek() {
        if (this._size === 0) return undefined;
        return this.array[0];
    }

    // remove the element on top of the heap (a smallest element)
    // runs in logarithmic time
    //
    // If the priority queue is empty, the function returns the
    // "undefined" value.
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/undefined
    //
    // For long-running and large priority queues, or priority queues
    // storing large objects, you may  want to call the trim function
    // at strategic times to recover allocated memory.
    public poll() {
        if (this._size === 0) return undefined;
        var ans = this.array[0];
        if (this._size > 1) {
            this.array[0] = this.array[--this._size];
            this.indexMap.set(make_key(this.array[0]), 0);
            this._percolateDown(0 | 0);
        } else {
            this._size -= 1;
        }
        this.indexMap.delete(make_key(ans));
        return ans;
    }

    // This function adds the provided value to the heap, while removing
    //  and returning the peek value (like poll). The size of the priority
    // thus remains unchanged.
    public replaceTop(myval: T) {
        if (this._size == 0) return undefined;
        var ans = this.array[0];
        this.array[0] = myval;
        this._percolateDown(0 | 0);
        return ans;
    }

    // recover unused memory (for long-running priority queues)
    public trim() {
        this.array = this.array.slice(0, this._size);
    }

    // Check whether the heap is empty
    public isEmpty() {
        return this._size === 0;
    }
}
