import type { Patch } from "@/lib/nodes/types";
import type { Tile } from "./types";
import { uuid } from "@/lib/uuid/IDGenerator";

type Direction = "horizontal" | "vertical";
export class TileNode implements Tile {
  parent: Tile | null;
  children: Tile[];
  position: { rowStart: number; rowEnd: number; colStart: number; colEnd: number };
  patch: Patch | null;
  splitDirection: Direction | null;
  size: number;
  id: string;

  constructor(
    patch: Patch | null,
    parent: TileNode | null = null,
    position = { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 },
  ) {
    this.id = uuid();
    this.parent = parent;
    this.children = [];
    this.position = position;
    this.patch = patch;
    this.splitDirection = null;
    this.size = 50;
  }

  searchSide(tile: Tile): number {
    // returns 0 if its on first childs subtree
    // and 1 if its on second childs sub tree
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
    if (this.patch) {
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

  split(direction: Direction, newPatch: Patch): void {
    this.splitDirection = direction;
    if (direction === "vertical") {
      // Horizontal split: Adjust rowStart and rowEnd
      const midRow = Math.floor((this.position.rowStart + this.position.rowEnd) / 2);
      this.children = [
        new TileNode(this.patch, this, { ...this.position, rowEnd: midRow }),
        new TileNode(newPatch, this, {
          ...this.position,
          rowStart: midRow + 1,
          rowEnd: midRow + 1,
        }),
      ];
    } else {
      // Vertical split: Adjust colStart and colEnd
      const midCol = Math.floor((this.position.colStart + this.position.colEnd) / 2);
      this.children = [
        new TileNode(this.patch, this, { ...this.position, colEnd: midCol }),
        new TileNode(newPatch, this, {
          ...this.position,
          colStart: midCol + 1,
          colEnd: midCol + 1,
        }),
      ];
    }

    this.patch = null; // This node now represents a container
  }

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
}
