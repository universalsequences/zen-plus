import type { Message } from "./types";

let counter = 0;

export class ListPool {
  private pool: Message[][] = [];
  private used: Message[][] = [];
  private objectPool: Record<string, any>[] = [];
  private usedObjects: Record<string, any>[] = [];
  private arrayPool: Float32Array[] = [];
  private usedArrays: Float32Array[] = [];

  getFloat32Array(size: number) {
    const list = this.arrayPool.pop() || this.newArray(size);
    this.usedArrays.push(list);
    return list;
  }

  newArray(size: number) {
    return new Float32Array(size);
  }

  get() {
    const list = this.pool.pop() || [];
    this.used.push(list);
    return list;
  }

  getObject(): Record<string, any> {
    const obj = this.objectPool.pop() || Object.create(null);
    return obj;
  }

  releaseUsed() {
    for (let u of this.used) {
      this.release(u);
    }
    this.used.length = 0;

    for (let u of this.usedObjects) {
      this.releaseObject(u);
    }
    this.usedObjects.length = 0;

    for (let u of this.usedArrays) {
      this.releaseArray(u);
    }
    this.usedArrays.length = 0;
  }

  releaseArray(arr: Float32Array): void {
    this.arrayPool.push(arr);
  }

  releaseObject(obj: Record<string, any>): void {
    for (const key in obj) {
      delete obj[key];
    }
    this.objectPool.push(obj);
  }

  release(list: Message[]) {
    list.length = 0; // Clear the list
    this.pool.push(list);
    counter++;
  }
}
