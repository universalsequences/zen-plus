import { Context, LoopContext, ContextMessageType } from './context';

export interface Block {
    idx: number | string;
    size: number;
    allocatedSize: number;
    channels: number;
    length: number;
    initData?: Float32Array; // if this exists, we should initialize the worklet with this data
}

export abstract class AbstractIndexer {
    abstract set idx(x: number | string);
    abstract get idx(): number | string;
    abstract set size(x: number);
    abstract get size(): number;
}

export class MemoryBlock extends AbstractIndexer {
    //idx: number | string;
    _size: number;
    allocatedSize: number;
    initData?: Float32Array; // if this exists, we should initialize the worklet with this data
    __idx: number | string;
    channels?: number;
    length?: number;
    _idx?: number | string;
    context: Context;
    waitingForResponse?: ContextMessageType;
    responseCallback?: (body: any) => void;

    constructor(context: Context, idx: number, size: number, allocatedSize: number, initData?: Float32Array) {
        super();
        this.context = context;
        this.__idx = -1;
        this._size = size;
        this.idx = idx;
        this.size = size;
        this.allocatedSize = allocatedSize;
        this.initData = initData;
    }

    set idx(x: number | string) {
        this.__idx = x;
    }

    get idx() {
        return this.__idx;
    }

    set size(x: number) {
        this._size = x;
    }

    get size() {
        return this._size;
    }

    respond(value: any) {
        this.responseCallback!(value);
        this.waitingForResponse = undefined;
    }

    get(): Promise<Float32Array> {
        this.context.postMessage({
            type: "memory-get",
            body: {
                idx: this.idx,
                allocatedSize: this.allocatedSize
            }
        })

        this.waitingForResponse = "memory-get";
        // once we've sent this we have to wait for a response from the
        // context

        return new Promise((resolve: (x: Float32Array) => void) => {
            this.responseCallback = resolve;
        });
    }
}

export class LoopMemoryBlock extends MemoryBlock {
    _idx: number | string;
    _size: number;
    context: LoopContext;
    allocatedSize: number;
    channels: number;
    length: number;
    initData?: Float32Array;

    constructor(context: LoopContext, idx: number, size: number, allocatedSize: number) {
        super(context, idx, size, allocatedSize);
        this.context = context;
        this._idx = idx;
        this._size = size;
        this.allocatedSize = allocatedSize;
        this.channels = 0;
        this.length = 0;
    }

    // in order for this to work in a loop we have to carve out memory for each iteration of the loop
    get idx(): number | string {
        // say 
        return `${this._idx} + ${this.allocatedSize}*${this.context.loopIdx}`;//*${this.context.loopSize}`;
    }

    set idx(x: number | string) {
        this._idx = x;
    }


    get size(): number {
        return this._size * this.context.loopSize;
    }

    set size(x: number) {
        this._size = x;
    }
}

