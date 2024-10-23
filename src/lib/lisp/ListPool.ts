import type { Message } from "./types";

export class ListPool {
  private pool: Message[][] = [];
  private used: Message[][] = [];
  private objectPool: Record<string, unknown>[] = [];
  private envPool: Record<string, unknown>[] = [];
  private usedObjects: Record<string, unknown>[] = [];
  private usedEnvs: Record<string, unknown>[] = [];
  private arrayPool: Float32Array[] = [];
  private usedArrays: Float32Array[] = [];
  private maxObjectPoolSize = 256; // Set a maximum size for the object pool

  borrow(x: Message) {}

  createObject(): Record<string, unknown> {
    if (this.objectPool.length > 500) {
      console.log("Creating new object", this);
    }
    return {};
  }

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

  getObject(): Record<string, unknown> {
    let obj: Record<string, unknown>;
    if (this.objectPool.length > 0) {
      obj = this.objectPool.pop()!;
    } else {
      obj = this.createObject();
    }
    this.usedObjects.push(obj);
    return obj;
  }

  getEnv(): Record<string, unknown> {
    const obj = this.envPool.pop() || Object.create(null);
    this.usedEnvs.push(obj);
    return obj;
  }

  releaseUsed() {
    for (const u of this.used) {
      this.release(u);
    }
    this.used.length = 0;

    if (this.usedObjects.length > 50) {
      console.log("releasing objects", this.usedObjects.length, this);
    }
    for (const u of this.usedObjects) {
      this.releaseObject(u);
    }
    this.usedObjects.length = 0;

    for (const u of this.usedEnvs) {
      this.releaseEnv(u);
    }
    this.usedEnvs.length = 0;

    for (const u of this.usedArrays) {
      this.releaseArray(u);
    }
    this.usedArrays.length = 0;
  }

  releaseArray(arr: Float32Array): void {
    this.arrayPool.push(arr);
  }

  releaseObject(obj: Record<string, unknown>): void {
    for (const key in obj) {
      delete obj[key];
    }
    if (this.objectPool.length < this.maxObjectPoolSize) {
      this.objectPool.push(obj);
    }
  }

  releaseEnv(obj: Record<string, unknown>): void {
    for (const key in obj) {
      delete obj[key];
    }
    this.envPool.push(obj);
  }

  release(list: Message[]) {
    list.length = 0; // Clear the list
    this.pool.push(list);
  }
}
