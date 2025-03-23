import React, { useRef, useState, useEffect, useCallback } from "react";
import { useStorage } from "@/contexts/StorageContext";
import { usePatchLoader } from "@/hooks/usePatchLoader";
import { Buffer } from "@/lib/tiling/types";
import { useLocked } from "@/contexts/LockedContext";
import { useTilesContext } from "@/contexts/TilesContext";
import PatchInner from "./PatchInner";
import { useZoom } from "@/hooks/useZoom";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import Toolbar from "./Toolbar";
import { useThemeContext } from "@radix-ui/themes";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import { MessageNode, ObjectNode, SubPatch, IOConnection } from "@/lib/nodes/types";
import { Connections, usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import { usePosition, Coordinates } from "@/contexts/PositionContext";
import { usePatchMouse } from "@/hooks/usePatchMouse";
import { PatchResizer } from "./PatchResizer";

/**
 * Interface for the selection area in the patch
 */
interface Selection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * PatchComponent represents a single patch in the patcher environment
 *
 * This component is responsible for rendering a patch with its nodes
 * and providing mouse interaction and drag-and-drop functionality.
 */
const PatchComponent: React.FC<{
  isWindow?: boolean;
  tileRef: React.RefObject<HTMLDivElement | null>;
  setFileToOpen: (x: any | null) => void;
  fileToOpen: any | null;
  maxWidth: number;
  maxHeight: number;
  visibleObjectNodes?: ObjectNode[];
  messageNodes?: MessageNode[];
  index: number;
  isCustomView?: boolean;
  children?: React.ReactNode;
  buffer: Buffer;
}> = ({
  isWindow,
  visibleObjectNodes,
  index,
  isCustomView,
  maxWidth,
  maxHeight,
  fileToOpen,
  setFileToOpen,
  tileRef,
  buffer,
  children,
}) => {
  useThemeContext();

  // Patch management hooks
  const {
    changeTileForPatch,
    patchDragging,
    setPatchDragging,
    rootTile,
    selectedPatch,
    setSelectedPatch,
    setSelectedBuffer,
    setWorkingBuffers,
  } = usePatches();
  const { updateConnections, patch } = usePatch();
  const loadPatch = usePatchLoader(patch);
  const { loadSubPatches } = useStorage();

  // UI state hooks
  const [draggingOver, setDraggingOver] = useState(false);
  const { gridTemplate } = useTilesContext();
  const { updateAttributes, selection } = useSelection();
  const { onNewMessage } = useMessage();
  const { lockedMode } = useLocked();

  // Mouse and position related hooks
  const { onClick, onMouseUp, onSelectionMove, onMouseDown, setResizingPatch } = usePatchMouse({
    isCustomView,
  });
  const {
    scrollRef,
    presentationMode,
    updatePositions,
    draggingCable,
    setDraggingCable,
    nearestInlet,
    setNearestInlet,
  } = usePosition();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setSelectedBuffer(buffer);
      // Update working buffers when selecting a buffer
      setWorkingBuffers((prev) => {
        // Add this buffer to the front of the list if not already there
        return [buffer, ...prev.filter((b) => b.id !== buffer.id)].slice(0, 10);
      });

      onClick(e);
    },
    [buffer],
  );

  // Zoom functionality
  const { zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

  // Selection tracking
  const isSelectedRef = useRef(selectedPatch);

  // Force presentation mode in custom view
  const effectivePresentationMode = isCustomView ? true : presentationMode;

  // Load patch from file if needed
  useEffect(() => {
    if (fileToOpen && !(patch as SubPatch).parentPatch) {
      loadPatch(fileToOpen);
      setFileToOpen(null);
    }
  }, [fileToOpen, patch, loadPatch, setFileToOpen]);

  // Track selected patch
  useEffect(() => {
    isSelectedRef.current = selectedPatch;
  }, [selectedPatch]);

  // Set this patch as selected if no other is selected
  useEffect(() => {
    if (!isCustomView) {
      if (!isSelectedRef.current) {
        setSelectedPatch(patch);
        setSelectedBuffer(buffer);
      }
      patch.onNewMessage = onNewMessage;
    }
  }, [onNewMessage, patch, buffer, setSelectedPatch, isCustomView]);

  // Set up attribute update handler
  useEffect(() => {
    patch.updateAttributes = updateAttributes;
  }, [patch, updateAttributes]);

  // Load subpatches on mount
  useEffect(() => {
    console.log("loading subpatches...");
    loadSubPatches();
  }, [loadSubPatches]);

  // Update message handler
  useEffect(() => {
    patch.onNewMessage = onNewMessage;
  }, [patch, onNewMessage]);

  // Initialize key bindings
  useKeyBindings(scrollRef);

  // Handle dropping patches for rearrangement
  const onDrop = useCallback(() => {
    setDraggingOver(false);
    if (patchDragging) {
      changeTileForPatch(patch, patchDragging);
      setPatchDragging(undefined);
    }
  }, [patch, patchDragging, changeTileForPatch, setPatchDragging]);

  // Update positions and connections when patch or presentation mode changes
  useEffect(() => {
    const positions: Coordinates = {};
    const connections: Connections = {};

    for (const node of [...patch.objectNodes, ...patch.messageNodes]) {
      // Skip nodes not included in presentation if in presentation mode
      if (effectivePresentationMode && !node.attributes["Include in Presentation"]) {
        continue;
      }

      // Use presentation position when in presentation mode
      positions[node.id] = effectivePresentationMode
        ? node.presentationPosition || node.position
        : node.position;

      // Collect all connections from node outlets
      const nodeConnections: IOConnection[] = [];
      for (const outlet of node.outlets) {
        nodeConnections.push(...outlet.connections);
      }
      connections[node.id] = nodeConnections;
    }

    updatePositions(positions, true);
    updateConnections(connections);
  }, [patch, effectivePresentationMode]);

  // Render the patch with calculated dimensions and styling
  return React.useMemo(() => {
    // Find the tile for this patch and calculate dimensions
    const tile = rootTile ? rootTile.findPatch(patch) : null;

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
    const animation = `${direction}-slide-${patch.id} 0.2s ease`;

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
      !isCustomView && patch === selectedPatch ? "selected-patch" : "",
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
        onMouseUp={isCustomView ? undefined : onMouseUp}
        onMouseMove={onSelectionMove}
        onDrop={onDrop}
        onMouseDown={onMouseDown}
        className={classList}
      >
        {!isCustomView && <PatchResizer isCustomView={false} />}

        <PatchInner
          isSelected={selectedPatch === patch}
          visibleObjectNodes={visibleObjectNodes}
          index={index}
          isCustomView={isCustomView}
          zoomRef={zoomRef}
          zoomableRef={zoomableRef}
        />
        {!isWindow && children}
      </div>
    );
  }, [
    patch,
    patchDragging,
    draggingCable,
    nearestInlet,
    setNearestInlet,
    maxWidth,
    setDraggingCable,
    gridTemplate,
    maxHeight,
    selectedPatch,
    visibleObjectNodes,
    index,
    isCustomView,
    selection,
    rootTile,
    lockedMode,
    effectivePresentationMode,
    draggingOver,
    onClick,
    onMouseUp,
    onSelectionMove,
    onDrop,
    onMouseDown,
    zoomRef,
    zoomableRef,
  ]);
};

export default PatchComponent;
