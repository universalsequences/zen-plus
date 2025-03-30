import type { Patch } from "@/lib/nodes/types";
import type { Tile, Buffer } from "./types";
import { BufferType } from "./types";
import { uuid } from "@/lib/uuid/IDGenerator";

type Direction = "horizontal" | "vertical";
export class TileNode implements Tile {
  parent: Tile | null;
  children: Tile[];
  position: { rowStart: number; rowEnd: number; colStart: number; colEnd: number };
  patch: Patch | null; // Legacy field, will be deprecated
  buffer: Buffer | null; // New field to replace patch
  splitDirection: Direction | null;
  size: number;
  id: string;

  constructor(
    patchOrBuffer: Patch | Buffer | null,
    parent: TileNode | null = null,
    position = { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 },
  ) {
    this.id = uuid();
    this.parent = parent;
    this.children = [];
    this.position = position;
    this.splitDirection = null;
    this.size = 50;

    // Handle initialization from either a Patch or a Buffer
    if (patchOrBuffer && "type" in patchOrBuffer) {
      // It's a Buffer
      this.buffer = patchOrBuffer as Buffer;
      this.patch = patchOrBuffer.type === BufferType.Patch ? patchOrBuffer.patch || null : null;
    } else {
      // It's a Patch or null - create a Buffer if it's a Patch
      this.patch = patchOrBuffer;
      if (patchOrBuffer) {
        this.buffer = {
          id: uuid(),
          type: BufferType.Patch,
          patch: patchOrBuffer,
          name: (patchOrBuffer as Patch).name || "Untitled Patch",
        };
      } else {
        this.buffer = null;
      }
    }
  }

  searchSide(tile: Tile): number {
    // returns 0 if its on first child's subtree
    // and 1 if its on second child's sub tree
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].search(tile)) {
        return i;
      }
    }
    return -1;
  }

  search(tile: Tile): boolean {
    if (this === tile) {
      return true;
    }
    for (const child of this.children) {
      if (child.search(tile)) {
        return true;
      }
    }
    return false;
  }

  getLeaves(): Tile[] {
    if (this.buffer || this.patch) {
      return [this];
    }
    let leaves: Tile[] = [];
    for (const child of this.children) {
      leaves = [...leaves, ...child.getLeaves()];
    }
    return leaves;
  }

  getDepth(): number {
    let i = 0;
    let p: Tile = this;
    while (p.parent) {
      i++;
      p = p.parent;
    }
    return i;
  }

  split(direction: Direction, newBufferOrPatch: Buffer | Patch): void {
    this.splitDirection = direction;

    // Convert Patch to Buffer if needed
    let newBuffer: Buffer;
    if (!("type" in newBufferOrPatch)) {
      // It's a Patch, convert to Buffer
      newBuffer = {
        id: uuid(),
        type: BufferType.Patch,
        patch: newBufferOrPatch,
        name: (newBufferOrPatch as Patch).name || "Untitled Patch",
      };
    } else {
      newBuffer = newBufferOrPatch as Buffer;
    }

    if (direction === "vertical") {
      // Horizontal split: Adjust rowStart and rowEnd
      const midRow = Math.floor((this.position.rowStart + this.position.rowEnd) / 2);
      this.children = [
        new TileNode(this.buffer || this.patch, this, { ...this.position, rowEnd: midRow }),
        new TileNode(newBuffer, this, {
          ...this.position,
          rowStart: midRow + 1,
          rowEnd: midRow + 1,
        }),
      ];
    } else {
      // Vertical split: Adjust colStart and colEnd
      const midCol = Math.floor((this.position.colStart + this.position.colEnd) / 2);
      this.children = [
        new TileNode(this.buffer || this.patch, this, { ...this.position, colEnd: midCol }),
        new TileNode(newBuffer, this, {
          ...this.position,
          colStart: midCol + 1,
          colEnd: midCol + 1,
        }),
      ];
    }

    // This node now represents a container
    this.patch = null;
    this.buffer = null;
  }

  // Legacy method, use findBuffer instead when possible
  findPatch(patch: Patch): Tile | null {
    if (this.patch === patch) {
      return this;
    }
    for (let child of this.children) {
      let result = child.findPatch(patch);
      if (result) {
        return result;
      }
    }
    return null;
  }

  findBuffer(bufferId: string): Tile | null {
    if (this.buffer && this.buffer.id === bufferId) {
      return this;
    }
    for (let child of this.children) {
      let result = child.findBuffer(bufferId);
      if (result) {
        return result;
      }
    }
    return null;
  }

  getAllBuffers() {
    const buffers: Buffer[] = [];
    if (this.buffer) {
      buffers.push(this.buffer);
    }
    buffers.push(...this.children.flatMap((x) => x.getAllBuffers()));
    return buffers;
  }
}
