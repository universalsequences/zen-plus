import type { Message } from "./types";

let counter = 0;

export class ListPool {
  private pool: Message[][] = [];
  private used: Message[][] = [];
  private objectPool: Record<string, any>[] = [];
  private envPool: Record<string, any>[] = [];
  private usedObjects: Record<string, any>[] = [];
  private usedEnvs: Record<string, any>[] = [];
  private arrayPool: Float32Array[] = [];
  private usedArrays: Float32Array[] = [];
  private warning = false;

  borrow(x: Message) {
    return;
    let index = -1;
    for (let i = 0; i < this.usedObjects.length; i++) {
      if (this.usedObjects[i] === x) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      this.usedObjects.splice(index, 1);
    }
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

  getObject(forceNew = false): Record<string, any> {
    if (this.objectPool.length === 0) {
      if (this.warning) {
        console.log(
          "warning but objectPool.length=%s",
          this.objectPool.length,
          [...this.objectPool],
          [...this.usedObjects],
        );
      }
      const obj = Object.create(null);
      counter++;
      if (counter % 1000 === 0) {
        console.log("created object #%s", counter);
      }
      this.usedObjects.push(obj);
      return obj;
    }
    const obj = this.objectPool.pop() || {};
    this.usedObjects.push(obj);
    return obj;
  }

  getEnv(): Record<string, any> {
    const obj = this.envPool.pop() || Object.create(null);
    this.usedEnvs.push(obj);
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

    for (let u of this.usedEnvs) {
      this.releaseEnv(u);
    }
    this.usedEnvs.length = 0;

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
    if (this.objectPool.length < 1000) {
      this.objectPool.push(obj);
    }
    if (this.objectPool.length > 1000) this.warning = true;
  }

  releaseEnv(obj: Record<string, any>): void {
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
