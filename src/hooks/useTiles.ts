import React, { useState, useEffect, useCallback } from "react";
import { SubPatch } from "@/lib/nodes/types";
import { usePatches } from "@/contexts/PatchesContext";
import { usePosition } from "@/contexts/PositionContext";
import { useTilesContext } from "@/contexts/TilesContext";
import { Coordinate, Patch, Size } from "@/lib/nodes/types";
import { useWindows } from "@/contexts/WindowsContext";

export enum PatchResizeType {
  South,
  East,
  North,
  West,
}

export interface ResizingPatch {
  gridTemplate: string;
  resizeType: PatchResizeType;
  startPosition: Coordinate;
  startSize?: Size;
}

export const useTiles = (patch: Patch) => {
  const [resizingPatch, setResizingPatch] = useState<ResizingPatch | null>(null);
  const { rootTile, gridLayout, selectedPatch, setSelectedPatch, gridTemplate } = usePatches();
  const { patchWindows } = useWindows();

  const { updateSize } = usePosition();

  const { setGridTemplate } = useTilesContext();

  const getTile = useCallback(() => {
    if (!rootTile) {
      return;
    }
    let tile = rootTile.findPatch(patch);
    return tile;
  }, [patch, rootTile]);

  const getBoundingTile = useCallback(
    (resizingPatch: ResizingPatch) => {
      let tile = getTile();
      if (!tile || !tile.parent) {
        return null;
      }
      if (
        resizingPatch.resizeType === PatchResizeType.East ||
        resizingPatch.resizeType === PatchResizeType.West
      ) {
        // need to find the nearest horizontal parent
        let parent: any = tile.parent;
        while (parent && parent.splitDirection !== "horizontal") {
          parent = parent.parent;
        }
        if (
          tile.parent.children[0] === tile &&
          parent.parent &&
          resizingPatch.resizeType === PatchResizeType.West
        ) {
          parent = parent.parent;
          while (parent && parent.splitDirection !== "horizontal") {
            parent = parent.parent;
          }
        }
        return parent;
      } else {
        // need to find the nearest horizontal parent
        let parent: any = tile.parent;
        while (parent && parent.splitDirection !== "vertical") {
          parent = parent.parent;
        }
        if (
          tile.parent.children[0] === tile &&
          parent.parent &&
          resizingPatch.resizeType === PatchResizeType.North
        ) {
          parent = parent.parent;
          while (parent && parent.splitDirection !== "vertical") {
            parent = parent.parent;
          }
        }
        return parent;
      }
    },
    [rootTile],
  );

  const onResizePatch = useCallback(
    (e: MouseEvent, lockedMode: boolean) => {
      if (!resizingPatch) {
        return;
      }

      let subpatch = patch as SubPatch;

      const isWindow = patchWindows.includes(patch);
      if (isWindow && subpatch) {
        let { startSize, resizeType } = resizingPatch;
        if (!startSize) {
          return;
        }
        let diffX = e.pageX - resizingPatch.startPosition.x;
        let diffY = e.pageY - resizingPatch.startPosition.y;
        let newWidth = startSize.width;
        let newHeight = startSize.height;
        if (resizeType === PatchResizeType.West || resizeType === PatchResizeType.East) {
          let widthDelta = diffX * 1;
          if (resizeType === PatchResizeType.West) {
            widthDelta *= -1;
          }
          newWidth = startSize.width + widthDelta;
        } else {
          let heightDelta = diffY * 2;
          if (resizeType === PatchResizeType.North) {
            heightDelta *= -1;
          }
          newHeight = startSize.height + heightDelta;
        }
        subpatch.parentNode.size = {
          height: newHeight,
          width: newWidth,
        };

        updateSize(subpatch.parentNode.id, { ...subpatch.parentNode.size });
        setGridTemplate(newWidth + " " + newHeight);

        return;
      }
      if (
        subpatch &&
        patch.presentationMode &&
        subpatch.parentNode.attributes["Custom Presentation"] //&&
        //lockedMode
      ) {
        // in this case, we wish to resize the patch
        let { startSize, resizeType } = resizingPatch;
        if (!startSize) {
          return;
        }

        let diffX = e.pageX - resizingPatch.startPosition.x;
        let diffY = e.pageY - resizingPatch.startPosition.y;
        let newWidth = startSize.width;
        let newHeight = startSize.height;
        if (resizeType === PatchResizeType.West || resizeType === PatchResizeType.East) {
          let widthDelta = diffX * 2;
          if (resizeType === PatchResizeType.West) {
            widthDelta *= -1;
          }
          newWidth = startSize.width + widthDelta;
        } else {
          let heightDelta = diffY * 2;
          if (resizeType === PatchResizeType.North) {
            heightDelta *= -1;
          }
          newHeight = startSize.height + heightDelta;
        }
        subpatch.parentNode.size = {
          height: newHeight,
          width: newWidth,
        };

        updateSize(subpatch.parentNode.id, { ...subpatch.parentNode.size });
        setGridTemplate(newWidth + " " + newHeight);
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
      if (
        (boundingTile &&
          tile &&
          tile.parent &&
          resizingPatch.resizeType === PatchResizeType.South &&
          boundingTile.searchSide(tile) === 0) ||
        (boundingTile &&
          resizingPatch.resizeType === PatchResizeType.North &&
          boundingTile.searchSide(tile) === 1)
      ) {
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

        let newGridTemplate = `${leftWidthPercent}% ${rightWidthPercent}%`;
        if (tile && tile.parent) {
          if (
            resizingPatch.resizeType === PatchResizeType.East ||
            resizingPatch.resizeType === PatchResizeType.West
          ) {
            let parent = boundingTile;
            let percentA = rightWidthPercent;

            let percentB = leftWidthPercent;
            parent.size = percentB;
            if (parent.searchSide(tile) === 0) {
              //children[0] === tile) {
              parent.size = percentA;
            } else {
              parent.size = percentB;
            }
            newGridTemplate = percentA + " " + percentB;
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
            if (parent) {
              parent.size = percentB;
            }
            /*
                    if (parent.searchSide(tile) === 0) { //children[0] === tile) {
                        parent.size = percentA;
                    } else {
                        parent.size = percentB;
                    }
                    */
            newGridTemplate = percentA + " " + percentB;
          }
        }
        setGridTemplate(newGridTemplate);
      }

      // Create the grid template string
    },
    [setGridTemplate, resizingPatch, patch, rootTile, updateSize, patchWindows],
  );

  return { resizingPatch, setResizingPatch, onResizePatch };
};
