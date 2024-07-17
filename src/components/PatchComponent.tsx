import React, { useRef, useState, useEffect, useCallback } from "react";
import { useStorage } from "@/contexts/StorageContext";
import { usePatchLoader } from "@/hooks/usePatchLoader";
import { useLocked } from "@/contexts/LockedContext";
import { getUpdatedSize } from "@/lib/utils";
import AssistantSidebar from "./AssistantSidebar";
import { useTilesContext } from "@/contexts/TilesContext";
import PatchInner from "./PatchInner";
import { useNodeOperations } from "@/hooks/useEncapsulation";
import { useZoom } from "@/hooks/useZoom";
import LockButton from "./LockButton";
import { useMessage } from "@/contexts/MessageContext";
import { traverseBackwards } from "@/lib/nodes/traverse";
import { useSelection } from "@/contexts/SelectionContext";
import Toolbar from "./Toolbar";
import Cables from "./Cables";
import { ContextMenu, useThemeContext } from "@radix-ui/themes";
import { ResizingPatch, PatchResizeType, useTiles } from "@/hooks/useTiles";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import ObjectNodeComponent from "./ObjectNodeComponent";
import {
  MessageNode,
  ObjectNode,
  Node,
  MessageType,
  SubPatch,
  Orientation,
  Coordinate,
  IOConnection,
} from "@/lib/nodes/types";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import MessageNodeComponent from "./MessageNodeComponent";
import { Connections, usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import {
  usePosition,
  ResizingNode,
  DraggingNode,
  Coordinates,
} from "@/contexts/PositionContext";
import PresentationMode from "./PresentationMode";
import { MiniToolbar } from "./toolbar/MiniToolbar";

interface Selection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PatchComponent: React.FC<{
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
    setGridTemplate,
  } = usePatches();

  const [draggingOver, setDraggingOver] = useState(false);
  const { gridTemplate } = useTilesContext();
  const {
    lastResizingTime,
    setSelection,
    updateAttributes,
    selection,
    selectedNodes,
    setSelectedNodes,
    setSelectedConnection,
  } = useSelection();
  const { onNewMessage } = useMessage();

  const {
    segmentCable,
    updateConnections,
    registerConnection,
    patch,
    objectNodes,
    messageNodes,
    newObjectNode,
  } = usePatch();

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
    updateSize,
    scrollRef,
    setResizingNode,
    resizingNode,
    setDraggingNode,
    draggingNode,
    sizeIndexRef,
    updatePosition,
    presentationMode,
    updatePositions,
    setDraggingSegmentation,
    draggingCable,
    setDraggingCable,
    checkNearInlets,
    nearestInlet,
    setNearestInlet,
    draggingSegmentation,
    setSize,
    size,
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

  const { onResizePatch, resizingPatch, setResizingPatch } = useTiles(patch);

  const lastClick = useRef(0);

  let draggingCableRef = useRef<any | null>(null);
  useEffect(() => {
    draggingCableRef.current = draggingCable;
  }, [draggingCable]);

  const onMouseUpNode = useCallback(
    (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
      if (resizingPatch) {
        setResizingPatch(null);
        return;
      }
      setDraggingNode(null);
      setResizingNode(null);
    },
    [
      setDraggingNode,
      setResizingNode,
      setResizingPatch,
      resizingPatch,
      nearestInlet,
      draggingCable,
    ],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
      if (nearestInlet && draggingCable) {
        if (draggingCable.sourceNode) {
          let destInlet = nearestInlet.node.inlets[nearestInlet.iolet];

          let connection = draggingCable.sourceNode.connect(
            nearestInlet.node,
            destInlet,
            draggingCable.sourceOutlet as any,
            true,
          );

          connection.created = true;
          registerConnection(draggingCable.sourceNode.id, connection);

          setNearestInlet(null);
          setDraggingCable(null);
        } else if (draggingCable.destNode && draggingCable.destInlet) {
          let connection = nearestInlet.node.connect(
            draggingCable.destNode,
            draggingCable.destInlet,
            nearestInlet.node.outlets[nearestInlet.iolet],
            true,
          );
          connection.created = true;

          registerConnection(nearestInlet.node.id, connection);

          setNearestInlet(null);
          setDraggingCable(null);
        }
      }

      if (draggingCableRef.current) {
        e.stopPropagation();
        setDraggingCable(null);
        return;
      }

      if (isCustomView) {
        return;
      }
      if (lockedMode) {
        return;
      }

      setDraggingSegmentation(null);

      if (selection && selection.patch === patch) {
        let all = [...patch.objectNodes, ...patch.messageNodes];
        let filtered = all.filter((node) => {
          let size = sizeIndexRef.current[node.id];
          let w = size ? size.width || 100 : 100;
          let h = size ? size.height || 7 : 7;
          if (node.attributes.slotview) {
            w = 180;
            h = 24;
          }
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          return (
            position.x + w >= selection.x1 &&
            position.x <= selection.x2 &&
            position.y + h >= selection.y1 &&
            position.y <= selection.y2
          );
        });
        setSelectedNodes(filtered);
      }
    },
    [
      patch,
      draggingCable,
      nearestInlet,
      setNearestInlet,
      setDraggingCable,
      setDraggingCable,
      presentationMode,
      resizingPatch,
      setResizingPatch,
      setDraggingSegmentation,
      setDraggingNode,
      setResizingNode,
      selection,
      setSelection,
      setSelectedNodes,
      messageNodes,
      objectNodes,
      lockedMode,
    ],
  );

  useEffect(() => {
    if (
      lockedMode &&
      presentationMode &&
      (patch as SubPatch).parentNode &&
      (patch as SubPatch).parentNode.attributes["Custom Presentation"]
    ) {
      if (scrollRef.current) {
        scrollRef.current.scrollTo(0, 0);
      }
    }
  }, [lockedMode, presentationMode]);

  const draggingNodeRef = useRef<DraggingNode | null>(null);
  const resizingNodeRef = useRef<ResizingNode | null>(null);

  useEffect(() => {
    draggingNodeRef.current = draggingNode;
    resizingNodeRef.current = resizingNode;
  }, [resizingNode, draggingNode]);

  const selectedNodesRef = useRef(selectedNodes);

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
    let node = selectedNodes[0];
    //if (node) {
    //    let backwards = traverseBackwards(node);
    //}
  }, [selectedNodes]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingCable && scrollRef.current) {
        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current; // - offset.x;
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
        checkNearInlets(x, y);
        return;
      }

      if (isCustomView) {
        return;
      }
      if (resizingPatch) {
        let updatedSize = onResizePatch(e, lockedMode);
        /*
            let subpatch = (patch as SubPatch);
            if (subpatch && subpatch.parentNode && updatedSize) {
                console.log('updating size=', subpatch.parentNode.id);
                updateSize(subpatch.parentNode.id, updatedSize);
            }
            */
        return;
      }

      if (!scrollRef.current) {
        return;
      }

      if (lockedMode) {
        return;
      }

      let rect = scrollRef.current.getBoundingClientRect();
      let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (draggingSegmentation) {
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
        let id = draggingSegmentation.source.id;
        let node = draggingSegmentation.source as ObjectNode;
        let height = node.size
          ? node.size.height
          : sizeIndexRef.current[id].height;
        if (height) {
          segmentCable(draggingSegmentation, y - height);
        }
      }
      if (resizingNodeRef.current) {
        lastResizingTime.current = new Date().getTime();
        if (resizingNodeRef.current.orientation === Orientation.X) {
          let { node, offset } = resizingNodeRef.current;
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current; // - offset.x;
          let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
          if (!node.size) {
            node.size = sizeIndexRef.current[node.id];
            // position`
          } else {
          }
          let width = x - position.x;
          node.size.width = width;
          updateSize(node.id, { ...node.size });
        } else if (resizingNodeRef.current.orientation === Orientation.Y) {
          let { node, offset } = resizingNodeRef.current;
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          let x = scrollRef.current.scrollLeft + client.x; // - offset.x;
          let y = scrollRef.current.scrollTop + client.y; //- offset.y;
          if (!node.size) {
            node.size = sizeIndexRef.current[node.id];
            // position`
          }
          let height = y - position.y;
          node.size.height = height;
          updateSize(node.id, { ...node.size });
        } else {
          let { node, offset } = resizingNodeRef.current;
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current; // - offset.x;
          let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current; //- offset.y;
          if (!node.size) {
            node.size = sizeIndexRef.current[node.id];
            // position`
          }
          let height = y - position.y;
          let width = x - position.x;
          node.size.height = height;
          node.size.width = width;
          updateSize(node.id, { ...node.size });
          for (let __node of selectedNodes) {
            if ((__node as ObjectNode).size) {
              let _node: ObjectNode = __node as ObjectNode;
              if (_node.size) {
                _node.size.height = height;
                _node.size.width = width;
                updateSize(_node.id, { ..._node.size });
              }
            }
          }
        }
      }

      if (draggingNodeRef.current) {
        let { node, offset } = draggingNodeRef.current;
        let x = scrollRef.current.scrollLeft + client.x - offset.x;
        let y = scrollRef.current.scrollTop + client.y - offset.y;
        x /= zoomRef.current;
        y /= zoomRef.current;

        let position = presentationMode
          ? node.presentationPosition || node.position
          : node.position;
        let diffX = x - position.x;
        let diffY = y - position.y;

        position.x = Math.max(0, x);
        position.y = Math.max(0, y);

        let updates: any = {};
        let nodeMap: any = {};

        for (let _node of selectedNodesRef.current) {
          if (selectedNodesRef.current.length > 1) {
            for (let outlet of _node.outlets) {
              for (let connection of outlet.connections) {
                if (connection.segmentation) {
                  connection.segmentation += diffY;
                }
              }
            }
          }
          if (node !== _node) {
            let _position = presentationMode
              ? _node.presentationPosition || _node.position
              : _node.position;
            _position.x = Math.max(0, _position.x + diffX);
            _position.y = Math.max(0, _position.y + diffY);
            updates[_node.id] = { ..._position };
          }
          nodeMap[_node.id] = _node;
        }
        updates[node.id] = { ...position };

        let _updates = updatePositions(updates);
        for (let id in updates) {
          let node = nodeMap[id];
          if (node) {
            if (presentationMode) {
              node.presentationPosition = updates[id];
            } else {
              node.position = updates[id];
            }
          }
        }
      }
    },
    [
      draggingCable,
      presentationMode,
      draggingSegmentation,
      resizingPatch,
      setGridTemplate,
      updatePositions,
      scrollRef,
      selection,
      setSelection,
      selectedNodes,
      updateSize,
      lockedMode,
    ],
  );

  useEffect(() => {
    if (lockedMode) {
      setDraggingNode(null);
      setSelectedNodes([]);
    }
  }, [lockedMode, setSelectedNodes, setDraggingNode]);

  useEffect(() => {
    patch.isSelected = patch === selectedPatch;
  }, [patch, selectedPatch]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUpNode);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUpNode);
    };
  }, [
    nearestInlet,
    presentationMode,
    draggingSegmentation,
    patch,
    draggingCable,
    resizingPatch,
    setDraggingSegmentation,
    draggingCable,
    setDraggingCable,
    resizingPatch,
    setResizingPatch,
    setGridTemplate,
    lockedMode,
    objectNodes,
    messageNodes,
    updatePositions,
    scrollRef,
    selection,
    setSelection,
    updateSize,
    selectedNodes,
    resizingNode,
    setResizingNode,
  ]);

  const onSelectionMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!scrollRef.current) {
        return;
      }
      let rect = scrollRef.current.getBoundingClientRect();
      let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (selection) {
        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
        setSelection({
          ...selection,
          patch: patch,
          x2: x,
          y2: y,
        });
      }
    },
    [setSelection, selection, patch],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (isCustomView) {
        return;
      }
      setSelectedPatch(patch);
      patch.onNewMessage = onNewMessage;
      if (e.button === 2) {
        return;
      }
      if (scrollRef.current && !lockedMode) {
        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
        setSelection({
          patch: patch,
          x1: x,
          y1: y,
          x2: x,
          y2: y,
        });
      }
    },
    [setSelection, onNewMessage, lockedMode, patch],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (isCustomView) {
        return;
      }
      setSelectedPatch(patch);
      if (e.button == 2) {
        return;
      }
      let now = new Date().getTime();
      if (now - lastResizingTime.current < 200) {
        return;
      }
      if (now - lastClick.current < 350 && scrollRef.current) {
        // create a new object

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

        let objectNode = new ObjectNodeImpl(patch);
        let position = {
          x,
          y,
        };

        objectNode.created = true;
        newObjectNode(objectNode, position);
        updatePosition(objectNode.id, position);
        setSelection(null);
        setSize(getUpdatedSize(objectNode, size));
      } else {
      }
      lastClick.current = now;
    },
    [
      setSelectedNodes,
      size,
      setSize,
      selection,
      setSelectedConnection,
      setSelection,
      patch,
    ],
  );

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
        _maxWidth =
          hparent && hparent.children[0] === hprev
            ? hparent.size
            : 100 - hparent.size;
      }

      if (vparent) {
        _maxHeight =
          vparent && vparent.children[0] === vprev
            ? vparent.size
            : 100 - vparent.size;
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

    if (
      tile &&
      tile.parent &&
      tile.parent.children[1] === tile &&
      tile.children.length === 0
    ) {
      style = {};
    }

    let isFloatingCustom = false;
    if (!isCustomView && (patch as SubPatch).parentNode && lockedMode) {
      let node = (patch as SubPatch).parentNode;
      if (
        false &&
        node.attributes["Custom Presentation"] &&
        node.size &&
        presentationMode
      ) {
        let parent = (patch as SubPatch).parentPatch;
        let parentNode = (parent as SubPatch).parentNode;
        //if (!parentNode || (!parentNode.attributes["Custom Presentation"])) {
        isFloatingCustom = lockedMode;
        style = {
          width: node.size.width + "px",
          height: node.size.height + "px",
          maxWidth: node.size.width + "px",
          maxHeight: node.size.height + "px",
          overflow: "hidden",
          margin: "auto",
        };

        // }
      }
    }

    if (tile && tile.parent && tileRef) {
      let matches = tile.parent.children.filter(
        (x) =>
          x.patch &&
          (x.patch as SubPatch).parentNode &&
          (x.patch as SubPatch).parentNode.attributes["Custom Presentation"] &&
          (x.patch as SubPatch).presentationMode,
      );
      if (matches.length > 0) {
        // theres some presentatio mode here...

        if (false && isFloatingCustom && (patch as SubPatch).parentNode) {
          style.minWidth = (patch as any).parentNode.size.width + "px";
          style.minHeight = (patch as any).parentNode.size.height + "px";
        } else if (tileRef.current) {
          let size = (matches[0].patch as SubPatch).parentNode.size;
          let tile_height = tileRef.current.offsetHeight;
          let tile_width = tileRef.current.offsetWidth;
          if (size) {
            let remainingHeight = tile_height - size.height - 20;
            let remainingWidth = tile_width - size.width - 20;
            style.minWidth = remainingWidth + "px";
            style.minHeight = remainingHeight + "px";
          }
        } else {
          style.minWidth = undefined;
          style.minHeight = undefined;
        }
      }
    }

    return (
      <>
        <div
          style={style}
          /*
                onMouseOver={() =>
                    setSelectedPatch(patch)}
                    */
          onDragOver={() => {
            setDraggingOver(true);
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
            (tile && tile.parent && tile.parent.children.length === 1
              ? "transition-all "
              : "") +
            "transition-colors duration-300 ease-in-out " +
            cl +
            " " +
            (!isCustomView && patch === selectedPatch
              ? "selected-patch "
              : "") +
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
                onMouseDown={(e: any) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("starting resize...");
                  setResizingPatch({
                    startSize:
                      (patch as SubPatch).parentNode &&
                      (patch as SubPatch).parentNode.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.South,
                  });
                }}
                className="w-full h-1 absolute bottom-0 cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e: any) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingPatch({
                    startSize:
                      (patch as SubPatch).parentNode &&
                      (patch as SubPatch).parentNode.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.North,
                  });
                }}
                className="w-full h-1 absolute top-0 cursor-ns-resize z-30"
              />
              <div
                onMouseDown={(e: any) => {
                  setSelectedPatch(patch);
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingPatch({
                    startSize:
                      (patch as SubPatch).parentNode &&
                      (patch as SubPatch).parentNode.size,
                    startPosition: { x: e.pageX, y: e.pageY },
                    gridTemplate,
                    resizeType: PatchResizeType.East,
                  });
                }}
                className="h-full w-1 absolute right-0 cursor-ew-resize z-30"
              />
              {!isCustomView && (
                <div
                  onMouseDown={(e: any) => {
                    setSelectedPatch(patch);
                    e.preventDefault();
                    e.stopPropagation();
                    setResizingPatch({
                      startSize:
                        (patch as SubPatch).parentNode &&
                        (patch as SubPatch).parentNode.size,
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

          {/*<AssistantSidebar />*/}
          <PatchInner
            isSelected={selectedPatch === patch}
            visibleObjectNodes={visibleObjectNodes}
            index={index}
            isCustomView={isCustomView}
            zoomRef={zoomRef}
            zoomableRef={zoomableRef}
          />
          {!isCustomView && (
            <>{selectedPatch === patch ? <Toolbar patch={patch} /> : ""}</>
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
