import React, { useRef, useState, useEffect, useCallback } from "react";
import { useStorage } from "@/contexts/StorageContext";
import AssistantSidebar from "./AssistantSidebar";
import { usePatchLoader } from "@/hooks/usePatchLoader";
import { useLocked } from "@/contexts/LockedContext";
import { useTilesContext } from "@/contexts/TilesContext";
import PatchInner from "./PatchInner";
import { useZoom } from "@/hooks/useZoom";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import Toolbar from "./Toolbar";
import { useThemeContext } from "@radix-ui/themes";
import { PatchResizeType } from "@/hooks/useTiles";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import { MessageNode, ObjectNode, SubPatch, IOConnection } from "@/lib/nodes/types";
import { Connections, usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import { usePosition, ResizingNode, DraggingNode, Coordinates } from "@/contexts/PositionContext";
import { usePatchMouse } from "@/hooks/usePatchMouse";

interface Selection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

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
}) => {
  useThemeContext();
  const {
    changeTileForPatch,
    patchDragging,
    setPatchDragging,
    rootTile,
    selectedPatch,
    setSelectedPatch,
  } = usePatches();

  const [draggingOver, setDraggingOver] = useState(false);
  const { gridTemplate } = useTilesContext();
  const { updateAttributes, selection } = useSelection();
  const { onNewMessage } = useMessage();

  const { onClick, onMouseUp, onSelectionMove, onMouseDown, setResizingPatch } = usePatchMouse({
    isCustomView,
  });

  const { updateConnections, patch } = usePatch();

  const loadPatch = usePatchLoader(patch);

  useEffect(() => {
    if (fileToOpen) {
      loadPatch(fileToOpen);
      setFileToOpen(null);
    }
  }, [fileToOpen]);

  let IS_SELECTED = useRef(selectedPatch);
  useEffect(() => {
    IS_SELECTED.current = selectedPatch;
  }, [selectedPatch]);

  useEffect(() => {
    if (!isCustomView) {
      if (!IS_SELECTED.current) {
        setSelectedPatch(patch);
      }
      patch.onNewMessage = onNewMessage;
    }
  }, [onNewMessage]);

  useEffect(() => {
    patch.updateAttributes = updateAttributes;
  }, [patch, updateAttributes]);

  const { loadSubPatches } = useStorage();

  useEffect(() => {
    loadSubPatches();
  }, []);

  let {
    scrollRef,
    presentationMode,
    updatePositions,
    draggingCable,
    setDraggingCable,
    nearestInlet,
    setNearestInlet,
  } = usePosition();

  const { lockedMode } = useLocked();

  let { zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

  if (isCustomView) {
    presentationMode = true;
  }

  useEffect(() => {
    patch.onNewMessage = onNewMessage;
  }, [patch, onNewMessage]);

  useKeyBindings(scrollRef);

  const onDrop = useCallback(() => {
    setDraggingOver(false);
    if (patchDragging) {
      changeTileForPatch(patch, patchDragging);
      setPatchDragging(undefined);
    }
  }, [patch, patchDragging]);

  useEffect(() => {
    let positions: Coordinates = {};
    let connections: Connections = {};
    for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
      if (presentationMode && !node.attributes["Include in Presentation"]) {
        continue;
      }
      positions[node.id] = presentationMode
        ? node.presentationPosition || node.position
        : node.position;
      let _connections: IOConnection[] = [];

      for (let outlet of node.outlets) {
        _connections = [..._connections, ...outlet.connections];
      }
      connections[node.id] = _connections;
    }
    updatePositions(positions, true);
    updateConnections(connections);
  }, [patch, presentationMode]);

  const mem = React.useMemo(() => {
    let tile = rootTile ? rootTile.findPatch(patch) : null;
    let direction =
      tile && tile.parent
        ? tile.parent.splitDirection === "vertical"
          ? "vertical"
          : "horizontal"
        : "";
    let _direction = direction;
    if (patch.viewed) {
      direction = "";
    } else {
    }
    let cl = "w-full h-full " + direction;

    let _maxWidth = null;
    let _maxHeight = null;
    if (tile && !isCustomView) {
      let vparent: any = tile.parent;
      let vprev = tile;
      while (vparent && vparent.splitDirection !== "vertical") {
        vprev = vparent;
        vparent = vparent.parent;
      }

      let hparent: any = tile.parent;
      let hprev = tile;
      while (hparent && hparent.splitDirection !== "horizontal") {
        hprev = hparent;
        hparent = hparent.parent;
      }

      if (hparent) {
        _maxWidth = hparent && hparent.children[0] === hprev ? hparent.size : 100 - hparent.size;
      }

      if (vparent) {
        _maxHeight = vparent && vparent.children[0] === vprev ? vparent.size : 100 - vparent.size;
      }

      if (tile.parent && tile.parent.splitDirection === "vertical") {
        _maxWidth = null;
      }
      if (tile.parent && tile.parent.splitDirection === "horizontal") {
        _maxHeight = null;
      }
    } else {
    }

    let keyframe = ``;
    if (_maxWidth) {
      keyframe = `@keyframes horizontal-slide-${patch.id} {
0% { max-width: ${patch.viewed ? 100 : 0}%};
    100% { max-width: ${_maxWidth}% }
}
`;
    } else {
      _maxWidth = 100;
    }
    if (_maxHeight) {
      keyframe = `@keyframes vertical-slide-${patch.id} {
0% { max-height: ${patch.viewed ? 100 : 0}%};
        100% { max-height: ${_maxHeight}% }
}
`;
    } else {
      _maxHeight = 100;
    }

    let animation = `${_direction}-slide-${patch.id} 0.2s ease`;

    let style: any = isCustomView
      ? {}
      : {
          animation,
          minWidth: _maxWidth + "%",
          minHeight: _maxHeight + "%",
          maxWidth: _maxWidth + "%",
          maxHeight: _maxHeight + "%",
        };

    if (tile && tile.parent && tile.parent.children[1] === tile && tile.children.length === 0) {
      style = {};
    }

    let isFloatingCustom = false;

    return (
      <>
        <div
          style={style}
          onDragOver={() => {
            if (patchDragging) {
              setDraggingOver(true);
            }
          }}
          onDragLeave={() => {
            setDraggingOver(false);
          }}
          onClick={onClick}
          onMouseUp={isCustomView ? undefined : onMouseUp}
          onMouseMove={onSelectionMove}
          onDrop={onDrop}
          onMouseDown={onMouseDown}
          className={
            (draggingOver ? " dragging-over " : "") +
            (isFloatingCustom ? " dark-background " : "") +
            (tile && tile.parent && tile.parent.children.length === 1 ? "transition-all " : "") +
            "transition-colors duration-300 ease-in-out " +
            cl +
            " " +
            (!isCustomView && patch === selectedPatch ? "selected-patch " : "") +
            (isCustomView ? "" : " border border-zinc-100 ") +
            " flex flex-col relative w-full " +
            (presentationMode ? " presentation " : "") +
            (lockedMode ? "locked" : "") +
            (isCustomView ? "" : " tile") +
            (isCustomView ? " custom-view" : "")
          }
        >
          {!isCustomView && (
            <>
              <div
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingPatch({
                    startSize: (patch as SubPatch).parentNode?.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.South,
                  });
                }}
                className="w-full h-1 absolute bottom-0 cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingPatch({
                    startSize: (patch as SubPatch).parentNode?.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.North,
                  });
                }}
                className="w-full h-1 absolute top-0 cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingPatch({
                    startSize: (patch as SubPatch).parentNode?.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.East,
                  });
                }}
                className="h-full w-1 absolute right-0 cursor-ew-resize z-30"
              />
              {!isCustomView && (
                <div
                  onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                    setSelectedPatch(patch);
                    e.preventDefault();
                    e.stopPropagation();
                    setResizingPatch({
                      startSize: (patch as SubPatch).parentNode?.size,
                      startPosition: { x: e.pageX, y: e.pageY },
                      gridTemplate,
                      resizeType: PatchResizeType.West,
                    });
                  }}
                  className="h-full w-1 absolute left-0 cursor-ew-resize z-30"
                />
              )}
            </>
          )}
          <PatchInner
            isSelected={selectedPatch === patch}
            visibleObjectNodes={visibleObjectNodes}
            index={index}
            isCustomView={isCustomView}
            zoomRef={zoomRef}
            zoomableRef={zoomableRef}
          />
          {!isCustomView && !isWindow && (
            <>
              {" "}
              <Toolbar patch={patch} />{" "}
            </>
          )}
        </div>
      </>
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
    presentationMode,
    lockedMode,
    draggingOver,
  ]);

  return mem;
};

export default PatchComponent;
