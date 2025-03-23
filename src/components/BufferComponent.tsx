import React, { useRef, useState, useCallback, useEffect } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { type Buffer, BufferType } from "@/lib/tiling/types";
import { useLocked } from "@/contexts/LockedContext";
import { useTilesContext } from "@/contexts/TilesContext";
import { PatchResizer } from "./PatchResizer";
import PatchInner from "./PatchInner";
import { useThemeContext } from "@radix-ui/themes";
import { Patch } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { usePatchMouse } from "@/hooks/usePatchMouse";
import { useZoom } from "@/hooks/useZoom";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import { useStorage } from "@/contexts/StorageContext";

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
  } = usePatches();

  // UI state hooks
  const [draggingOver, setDraggingOver] = useState(false);
  const { gridTemplate } = useTilesContext();
  const { lockedMode } = useLocked();
  const { loadSubPatches } = useStorage();
  const { selection, updateAttributes, setSelection, setSelectedNodes, setSelectedConnection } =
    useSelection();

  useEffect(() => {
    loadSubPatches();
  }, []);
  const { nearestInlet, draggingCable, presentationMode } = usePosition();

  // Extract patch for Patch buffer type (for backward compatibility)
  const patch = buffer.type === BufferType.Patch ? buffer.patch : null;

  // Set presentation mode based on view type
  const effectivePresentationMode = isCustomView ? true : presentationMode;

  // Refs for zoom and scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const { zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

  // Initialize key bindings for patch type buffers
  useKeyBindings(scrollRef, patch);

  // Set up mouse handlers for patch interactions
  const {
    onClick: onPatchClick,
    onMouseUp,
    onSelectionMove,
    onMouseDown,
  } = usePatchMouse({
    isCustomView,
  });

  // Set up initialization for patch
  useEffect(() => {
    if (patch) {
      patch.updateAttributes = updateAttributes;

      // Update the selected patch when the buffer is of type patch
      if (selectedBuffer === buffer) {
        setSelectedPatch(patch);
      }
    }
  }, [patch, updateAttributes, selectedBuffer, buffer, setSelectedPatch]);

  // Handle dropping patches for rearrangement
  const onDrop = useCallback(() => {
    setDraggingOver(false);
    if (patchDragging && patch) {
      changeTileForPatch(patch, patchDragging);
      setPatchDragging(undefined);
    }
  }, [patch, patchDragging, changeTileForPatch, setPatchDragging]);

  // Handler for clicks in the buffer area
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Select this buffer
      setSelectedBuffer(buffer);

      // For Patch type buffers, also handle patch-specific clicks
      if (buffer.type === BufferType.Patch && patch) {
        setSelectedPatch(patch);
        onPatchClick(e);
      } else if (selection && selection.x1 === selection.x2) {
        // Clear selection when clicking on empty space
        setSelectedNodes([]);
        setSelectedConnection(null);
        setSelection(null);
      }
    },
    [
      buffer,
      setSelectedBuffer,
      patch,
      setSelectedPatch,
      onPatchClick,
      selection,
      setSelectedNodes,
      setSelectedConnection,
      setSelection,
    ],
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
      effectivePresentationMode ? "presentation" : "",
      lockedMode ? "locked" : "",
      isCustomView ? "custom-view" : "tile",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        style={style}
        onDragOver={() => patchDragging && setDraggingOver(true)}
        onDragLeave={() => setDraggingOver(false)}
        onClick={handleClick}
        onMouseUp={buffer.type === BufferType.Patch ? onMouseUp : undefined}
        onMouseMove={buffer.type === BufferType.Patch ? onSelectionMove : undefined}
        onMouseDown={buffer.type === BufferType.Patch ? onMouseDown : undefined}
        onDrop={onDrop}
        className={classList}
      >
        {!isCustomView && <PatchResizer isCustomView={false} />}

        {/* Render content based on buffer type */}
        {buffer.type === BufferType.Patch && buffer.patch && (
          <PatchInner
            isSelected={selectedBuffer === buffer}
            index={index}
            isCustomView={isCustomView}
            patch={buffer.patch}
            zoomRef={zoomRef}
            zoomableRef={zoomableRef}
            fileToOpen={fileToOpen}
            setFileToOpen={setFileToOpen}
          />
        )}
        {buffer.type === BufferType.Object && (
          <div className="p-4 text-white">Object Buffer (Not yet implemented)</div>
        )}
        {buffer.type === BufferType.Dired && (
          <div className="p-4 text-white">Directory Browser (Not yet implemented)</div>
        )}
        {buffer.type === BufferType.BufferList && (
          <div className="p-4 text-white">Buffer List (Not yet implemented)</div>
        )}

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
    lockedMode,
    effectivePresentationMode,
    draggingOver,
    handleClick,
    onMouseUp,
    onSelectionMove,
    onMouseDown,
    onDrop,
    draggingCable,
    nearestInlet,
    zoomRef,
    zoomableRef,
    selection,
    fileToOpen,
    setFileToOpen,
  ]);
};

export default BufferComponent;
