import React, { useState, useEffect, useCallback } from 'react';
import { usePatches } from '@/contexts/PatchesContext';
import { Coordinate, Patch } from '@/lib/nodes/types';

export enum PatchResizeType {
    South,
    East,
    North,
    West,
}

export interface ResizingPatch {
    gridTemplate: string;
    resizeType: PatchResizeType
    startPosition: Coordinate;
}

export const useTiles = (patch: Patch) => {
    const [resizingPatch, setResizingPatch] = useState<ResizingPatch | null>(null);
    const { rootTile, gridLayout, selectedPatch, setSelectedPatch, setGridTemplate, gridTemplate } = usePatches();

    const getTile = useCallback(() => {
        if (!rootTile) {
            return;
        }
        let tile = rootTile.findPatch(patch);
        return tile;
    }, [patch, rootTile]);

    const getBoundingTile = useCallback((resizingPatch: ResizingPatch) => {
        let tile = getTile();
        if (!tile || !tile.parent) {
            return null;
        }
        if (resizingPatch.resizeType === PatchResizeType.East ||
            resizingPatch.resizeType === PatchResizeType.West) {
            // need to find the nearest horizontal parent
            let parent: any = tile.parent;
            while (parent && parent.splitDirection !== "horizontal") {
                parent = parent.parent;
            }
            if (tile.parent.children[0] === tile && parent.parent && resizingPatch.resizeType === PatchResizeType.West) {
                parent = parent.parent;
                while (parent && parent.splitDirection !== "horizontal") {
                    parent = parent.parent;
                }
            }
            return parent;
        }
        else {
            // need to find the nearest horizontal parent
            let parent: any = tile.parent;
            while (parent && parent.splitDirection !== "vertical") {
                parent = parent.parent;
            }
            if (tile.parent.children[0] === tile && parent.parent && resizingPatch.resizeType === PatchResizeType.North) {
                parent = parent.parent;
                while (parent && parent.splitDirection !== "vertical") {
                    parent = parent.parent;
                }
            }
            return parent;
        }
    }, [rootTile]);

    const onResizePatch = useCallback((e: MouseEvent) => {
        if (!resizingPatch) {
            return;
        }

        let boundingTile = getBoundingTile(resizingPatch);
        let ref = boundingTile && boundingTile.ref;

        let pageWidth = ref && ref.current ? ref.current.offsetWidth : window.innerWidth;
        let pageHeight = ref && ref.current ? ref.current.offsetHeight : window.innerHeight;
        let rect = ref && ref.current ? ref.current.getBoundingClientRect() : null;
        let x = rect ? e.clientX - rect.left : e.pageX;
        let y = rect ? e.clientY - rect.top : e.pageY;
        let leftWidthPercent = (x / pageWidth) * 100;
        let rightWidthPercent = 100 - leftWidthPercent;

        let topHeightPercent = (y / pageHeight) * 100;
        let bottomHeightPercent = 100 - topHeightPercent;

        let tile = getTile();
        if (boundingTile && tile && tile.parent && (resizingPatch.resizeType === PatchResizeType.South &&
            boundingTile.searchSide(tile) === 0) ||
            (resizingPatch.resizeType === PatchResizeType.North &&
                boundingTile.searchSide(tile) === 1)) {
            let tmp = bottomHeightPercent;
            bottomHeightPercent = topHeightPercent;
            topHeightPercent = tmp;
        }

        if (resizingPatch.resizeType === PatchResizeType.East) {
            let tmp = leftWidthPercent;
            leftWidthPercent = rightWidthPercent;
            rightWidthPercent = tmp;
        }

        if (rootTile) {
            let tile = rootTile.findPatch(patch);

            if (tile && tile.parent) {
                if (resizingPatch.resizeType === PatchResizeType.East ||
                    resizingPatch.resizeType === PatchResizeType.West) {
                    // need to find the nearest horizontal parent
                    /*
                    let parent: any = tile.parent;
                    while (parent && parent.splitDirection !== "horizontal") {
                        parent = parent.parent;
                    }
                    if (tile.parent.children[0] === tile && parent.parent && resizingPatch.resizeType === PatchResizeType.West) {
                        parent = parent.parent;
                        while (parent && parent.splitDirection !== "horizontal") {
                            parent = parent.parent;
                        }
                    }
                    */
                    let parent = boundingTile;
                    let percentA = rightWidthPercent;

                    let percentB = leftWidthPercent;
                    parent.size = percentB;
                    if (parent.searchSide(tile) === 0) {//children[0] === tile) {
                        parent.size = percentA;
                    } else {
                        parent.size = percentB;
                    }
                } else {
                    // need to find the nearest horizontal parent
                    /*
                    let parent: any = tile.parent;
                    while (parent && parent.splitDirection !== "vertical") {
                        parent = parent.parent;
                    }
                    */
                    let parent = boundingTile;
                    let percentA = topHeightPercent;

                    let percentB = bottomHeightPercent;
                    parent.size = percentB;
                    /*
                    if (parent.searchSide(tile) === 0) { //children[0] === tile) {
                        parent.size = percentA;
                    } else {
                        parent.size = percentB;
                    }
                    */
                }

            }
        }

        // Create the grid template string
        let newGridTemplate = `${leftWidthPercent}% ${rightWidthPercent}%`;

        setGridTemplate(newGridTemplate);
    }, [setGridTemplate, resizingPatch]);

    return { resizingPatch, setResizingPatch, onResizePatch };
};
