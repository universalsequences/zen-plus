import { Patch } from '@/lib/nodes/types';

export interface Tile {
    id: string;
    parent: Tile | null;
    children: Tile[];
    position: { rowStart: number; rowEnd: number; colStart: number; colEnd: number };
    patch: Patch | null; // Store the associated patch
    split: (direction: 'horizontal' | 'vertical', newPatch: Patch) => void;
    splitDirection: "horizontal" | "vertical" | null;
    findPatch: (x: Patch) => Tile | null;
    size: number;
    ref?: React.MutableRefObject<HTMLDivElement | null>;
    searchSide: (tile: Tile) => number;
    search: (tile: Tile) => boolean;
    getLeaves: () => Tile[];
    getDepth: () => number;
}

