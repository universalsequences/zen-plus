import { ObjectNode, Patch } from "@/lib/nodes/types";

export enum BufferType {
  Patch,
  Object,
  Dired,
  BufferList,
  WorkletCode,
}

export interface Buffer {
  id: string;
  type: BufferType;
  name?: string;
  patch?: Patch;
  objectNode?: ObjectNode;
}

export interface Tile {
  id: string;
  getAllBuffers: () => Buffer[];
  parent: Tile | null;
  children: Tile[];
  position: { rowStart: number; rowEnd: number; colStart: number; colEnd: number };
  patch: Patch | null; // Legacy field, will be deprecated
  buffer: Buffer | null; // New field to replace patch
  split: (direction: "horizontal" | "vertical", newBuffer: Buffer) => void;
  splitDirection: "horizontal" | "vertical" | null;
  findBuffer: (bufferId: string) => Tile | null;
  findPatch: (x: Patch) => Tile | null; // Legacy method, will be deprecated
  size: number;
  ref?: React.MutableRefObject<HTMLDivElement | null>;
  searchSide: (tile: Tile) => number;
  search: (tile: Tile) => boolean;
  getLeaves: () => Tile[];
  getDepth: () => number;
}
