import React, { useRef, useState, useCallback, useEffect } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { type Buffer, BufferType } from "@/lib/tiling/types";
import { useLocked, LockedProvider } from "@/contexts/LockedContext";
import { useTilesContext } from "@/contexts/TilesContext";
import { PatchResizer } from "./PatchResizer";
import PatchInner from "./PatchInner";
import { useThemeContext } from "@radix-ui/themes";
import { Patch } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition, PositionProvider } from "@/contexts/PositionContext";
import { usePatchMouse } from "@/hooks/usePatchMouse";
import { useZoom } from "@/hooks/useZoom";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import { useStorage } from "@/contexts/StorageContext";
import { PatchProvider } from "@/contexts/PatchContext";
import BufferListView from "./BufferListView";
import DiredView from "./DiredView";
import ObjectNodeWrapper from "./ObjectNodeWrapper";

/**
 * BufferComponent represents a generic container for any buffer type in a tile
 *
 * This component provides the common styling and layout for all buffer types,
 * delegating the specific rendering to components appropriate for each buffer type.
 */
const BufferComponent: React.FC<{
  isWindow?: boolean;
  tileRef: React.RefObject<HTMLDivElement | null>;
  maxWidth: number;
  maxHeight: number;
  index: number;
  isCustomView?: boolean;
  children?: React.ReactNode;
  buffer: Buffer;
  fileToOpen?: any | null;
  setFileToOpen?: (x: any | null) => void;
}> = ({
  isWindow,
  index,
  isCustomView,
  maxWidth,
  maxHeight,
  tileRef,
  children,
  buffer,
  fileToOpen,
  setFileToOpen,
}) => {
  useThemeContext();

  // Patch management hooks
  const {
    rootTile,
    selectedBuffer,
    setSelectedBuffer,
    patchDragging,
    setPatchDragging,
    changeTileForPatch,
    setSelectedPatch,
    setWorkingBuffers,
  } = usePatches();

  // UI state hooks
  const [draggingOver, setDraggingOver] = useState(false);
  const { gridTemplate } = useTilesContext();
  const { loadSubPatches } = useStorage();

  // Extract patch for Patch buffer type (for backward compatibility)
  const patch = buffer.type === BufferType.Patch ? buffer.patch : null;

  // Refs for zoom and scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const { zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

  // Handler for clicks in the buffer area
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Select this buffer
      console.log("selecting buffer");
      setSelectedBuffer(buffer);

      // Update working buffers when selecting a buffer
      setWorkingBuffers((prev) => {
        // Add this buffer to the front of the list if not already there
        return [buffer, ...prev.filter((b) => b.id !== buffer.id)].slice(0, 10);
      });
    },
    [buffer, setSelectedBuffer, patch, setSelectedPatch, setWorkingBuffers],
  );

  // Render the buffer with calculated dimensions and styling
  return React.useMemo(() => {
    // Find the tile for this buffer or patch
    const tile = rootTile
      ? rootTile.findBuffer(buffer.id) || (patch ? rootTile.findPatch(patch) : null)
      : null;

    // Determine direction based on parent tile
    const direction =
      tile && tile.parent
        ? tile.parent.splitDirection === "vertical"
          ? "vertical"
          : "horizontal"
        : "";
    const directionClass = "w-full h-full " + direction;

    // Calculate maximum dimensions based on parent tiles
    let maxWidthPercent = null;
    let maxHeightPercent = null;

    if (tile && !isCustomView) {
      // Find vertical parent
      let vparent = tile.parent;
      let vprev = tile;
      while (vparent && vparent.splitDirection !== "vertical") {
        vprev = vparent;
        vparent = vparent.parent;
      }

      // Find horizontal parent
      let hparent = tile.parent;
      let hprev = tile;
      while (hparent && hparent.splitDirection !== "horizontal") {
        hprev = hparent;
        hparent = hparent.parent;
      }

      // Calculate dimensions based on parent tiles
      if (hparent) {
        maxWidthPercent = hparent.children[0] === hprev ? hparent.size : 100 - hparent.size;
      }

      if (vparent) {
        maxHeightPercent = vparent.children[0] === vprev ? vparent.size : 100 - vparent.size;
      }

      // Override dimensions based on parent split direction
      if (tile.parent && tile.parent.splitDirection === "vertical") {
        maxWidthPercent = null;
      }
      if (tile.parent && tile.parent.splitDirection === "horizontal") {
        maxHeightPercent = null;
      }
    }

    // Set default dimensions if not calculated
    maxWidthPercent = maxWidthPercent || 100;
    maxHeightPercent = maxHeightPercent || 100;

    // Animation definition for smooth transitions
    const animation = `${direction}-slide-${buffer.id} 0.2s ease`;

    // Apply styling based on view type
    let style = isCustomView
      ? {}
      : {
          animation,
          minWidth: maxWidthPercent + "%",
          minHeight: maxHeightPercent + "%",
          maxWidth: maxWidthPercent + "%",
          maxHeight: maxHeightPercent + "%",
        };

    // Override style for specific tile arrangement
    if (tile && tile.parent && tile.parent.children[1] === tile && tile.children.length === 0) {
      style = {};
    }

    // Build class list based on component state
    const classList = [
      draggingOver ? "dragging-over" : "",
      tile && tile.parent && tile.parent.children.length === 1 ? "transition-all" : "",
      "transition-colors duration-300 ease-in-out",
      directionClass,
      !isCustomView && buffer === selectedBuffer ? "selected-buffer" : "",
      isCustomView ? "" : "border border-zinc-100",
      "flex flex-col relative w-full",
      isCustomView ? "custom-view" : "tile",
      "bg-zinc-950",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        style={style}
        onDragOver={() => patchDragging && setDraggingOver(true)}
        onDragLeave={() => setDraggingOver(false)}
        onClick={handleClick}
        className={classList}
      >
        {buffer.type === BufferType.Patch && buffer.patch && (
          <PatchInner
            isSelected={buffer === selectedBuffer}
            index={index}
            isCustomView={isCustomView}
            patch={buffer.patch}
            zoomRef={zoomRef}
            zoomableRef={zoomableRef}
            fileToOpen={fileToOpen}
            setFileToOpen={setFileToOpen}
          />
        )}
        {buffer.type === BufferType.Object && buffer.objectNode && buffer.patch && (
          <PatchProvider buffer={buffer} patch={buffer.patch}>
            <LockedProvider patch={buffer.patch}>
              <PositionProvider patch={buffer.patch}>
                <div className="p-4 h-full w-full flex-grow flex-1 relative locked presentation">
                  <ObjectNodeWrapper objectNode={buffer.objectNode} />
                </div>
              </PositionProvider>
            </LockedProvider>
          </PatchProvider>
        )}
        {buffer.type === BufferType.Dired && <DiredView buffer={buffer} />}
        {buffer.type === BufferType.BufferList && <BufferListView buffer={buffer} />}

        {!isWindow && children}
      </div>
    );
  }, [
    buffer,
    patchDragging,
    maxWidth,
    maxHeight,
    gridTemplate,
    selectedBuffer,
    index,
    isCustomView,
    rootTile,
    draggingOver,
    handleClick,
    zoomRef,
    zoomableRef,
    fileToOpen,
    setFileToOpen,
  ]);
};

export default BufferComponent;
