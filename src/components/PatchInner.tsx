import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNodeOperations } from "@/hooks/useEncapsulation";
import { usePatchOrganizer } from "@/hooks/usePatchOrganizer";
import { useZoom } from "@/hooks/useZoom";
import LockButton from "./LockButton";
import { useMessage } from "@/contexts/MessageContext";
import { traverseBackwards } from "@/lib/nodes/traverse";
import { useSelection } from "@/contexts/SelectionContext";
import { useLocked } from "@/contexts/LockedContext";
import Toolbar from "./Toolbar";
import Cables from "./Cables";
import { ContextMenu, useThemeContext } from "@radix-ui/themes";
import { useKeyBindings } from "@/hooks/useKeyBindings";
import ObjectNodeWrapper from "./ObjectNodeWrapper";
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
import MessageNodeWrapper from "./MessageNodeWrapper";
import { Connections, usePatch } from "@/contexts/PatchContext";
import { usePosition, ResizingNode, DraggingNode, Coordinates } from "@/contexts/PositionContext";
import PresentationMode from "./PresentationMode";

interface Selection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PatchInner: React.FC<{
  isSelected: boolean;
  zoomRef: React.MutableRefObject<number>;
  zoomableRef: React.MutableRefObject<HTMLDivElement | null>;
  visibleObjectNodes?: ObjectNode[];
  messageNodes?: MessageNode[];
  index: number;
  isCustomView?: boolean;
}> = React.memo(({ isSelected, zoomRef, zoomableRef, visibleObjectNodes, index, isCustomView }) => {
  useThemeContext();

  const { organize } = usePatchOrganizer();
  const {
    lastResizingTime,
    setSelection,
    selection,
    selectedNodes,
    setSelectedNodes,
    setSelectedConnection,
  } = useSelection();
  const { onNewMessage } = useMessage();

  let {
    scrollRef,
    resizingNode,
    setDraggingNode,
    draggingNode,
    sizeIndexRef,
    updatePosition,
    presentationMode,
    updatePositions,
    draggingCable,
  } = usePosition();

  const { lockedMode } = useLocked();

  //let { zoom, zoomableRef, zoomRef } = useZoom(scrollRef, isCustomView);

  if (isCustomView) {
    presentationMode = true;
  }

  const { segmentCables, updateConnections, patch, objectNodes, messageNodes, newObjectNode } =
    usePatch();

  useEffect(() => {
    patch.onNewMessage = onNewMessage;
  }, [patch, onNewMessage]);

  // useKeyBindings(scrollRef);

  const lastClick = useRef(0);

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

  useEffect(() => {
    if (lockedMode) {
      setDraggingNode(null);
      console.log("inner set selected nodes...");
      //setSelectedNodes([]);
    }
  }, [lockedMode, setSelectedNodes, setDraggingNode]);

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
    updatePositions(positions);
    updateConnections(connections);
  }, [patch, presentationMode]);

  let {
    encapsulate,
    handleContextMenu,
    createMessageNode,
    createObjectNode,
    createNumberBox,
    presentation,
  } = useNodeOperations({
    isCustomView,
    zoomRef,
    scrollRef,
  });

  const [dragging, setDragging] = useState(false);
  const [preDragging, setPreDragging] = useState(false);

  let out = React.useMemo(() => {
    let inner = (
      <div className={(draggingCable ? " dragging-cable " : "") + "patcher-background"}>
        <div
          onDragOver={(e: any) => e.preventDefault()}
          onDragStart={(e: any) => {
            console.log("Dragging = true");
          }}
          onDragEnd={(e: any) => {
            console.log("Dragging = false");
            setPreDragging(false);
          }}
          ref={zoomableRef}
          draggable={preDragging}
          className=" flex flex-1 select-none z-1 "
        >
          {!preDragging && !isCustomView && <Cables />}
          {selection && selection.patch === patch && (
            <div
              style={{
                left: selection.x1 + "px",
                top: selection.y1 + "px",
                width: selection.x2 - selection.x1 + "px",
                height: selection.y2 - selection.y1 + "px",
              }}
              className="bg-red-500 absolute pointer-events-none z-1 opacity-50 border-zinc-100 border"
            />
          )}
          {objectNodes
            .filter((x) => {
              if (!preDragging || !zoomableRef.current) {
                return true;
              }
              let width = x.size ? x.size.width : 100;
              return x.position.x + width < zoomableRef.current.offsetWidth;
            })
            .filter((x) => (presentationMode ? x.attributes["Include in Presentation"] : true))
            .map((objectNode, index) =>
              objectNode.name === "outputs" ? (
                ""
              ) : (
                <ObjectNodeWrapper key={objectNode.id} objectNode={objectNode} />
              ),
            )}
          {messageNodes
            .filter((x) => {
              if (!preDragging || !zoomableRef.current) {
                return true;
              }
              return x.position.x < zoomableRef.current.offsetWidth;
            })
            .filter((x) => (presentationMode ? x.attributes["Include in Presentation"] : true))
            .map((messageNode, index) => (
              <MessageNodeWrapper key={messageNode.id} messageNode={messageNode} />
            ))}
        </div>
      </div>
    );
    let isFloatingCustom = false;
    if (!isCustomView && (patch as SubPatch).parentNode && lockedMode) {
      let node = (patch as SubPatch).parentNode;
      if (node.attributes["Custom Presentation"] && node.size && presentationMode) {
        let parent = (patch as SubPatch).parentPatch;
        let parentNode = (parent as SubPatch).parentNode;
        if (!parentNode || !parentNode.attributes["Custom Presentation"]) {
          isFloatingCustom = lockedMode;
        } else {
        }
      }
    }

    return (
      <div onContextMenu={handleContextMenu} className="w-full h-full flex overflow-hidden">
        <>
          {isCustomView ? (
            inner
          ) : (
            <ContextMenu.Root>
              <ContextMenu.Content
                color="indigo"
                className="object-context p-2 rounded-md text-white text-xs"
                onMouseDown={(e: any) => e.stopPropagation()}
              >
                <ContextMenu.Item
                  onClick={() => createObjectNode()}
                  className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                >
                  New Object
                </ContextMenu.Item>
                <ContextMenu.Item
                  onClick={createMessageNode}
                  className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                >
                  New Message Box
                </ContextMenu.Item>
                <ContextMenu.Item
                  onClick={createNumberBox}
                  className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                >
                  New Number Box
                </ContextMenu.Item>
                <ContextMenu.Item
                  onClick={() => segmentCables(sizeIndexRef.current)}
                  className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                >
                  Segment All Cables
                </ContextMenu.Item>
                {selectedNodes.length > 0 && (
                  <ContextMenu.Item
                    onClick={() => presentation(selectedNodes)}
                    className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                  >
                    Include in Presentation {selectedNodes.length} nodes
                  </ContextMenu.Item>
                )}
                {selectedNodes.length > 1 && (
                  <ContextMenu.Item
                    onClick={() => encapsulate(selectedNodes)}
                    className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer"
                  >
                    Encapsulate {selectedNodes.length} nodes
                  </ContextMenu.Item>
                )}
              </ContextMenu.Content>
              <ContextMenu.Trigger
                className={
                  (preDragging ? " rounded-2xl " : "") +
                  (preDragging || isFloatingCustom ? "overflow-hidden" : "overflow-scroll") +
                  (isCustomView ? "" : "") +
                  " ContextMenuTrigger relative w-full h-full flex" +
                  " w-full h-full flex flex-col "
                }
                ref={scrollRef}
              >
                {inner}
              </ContextMenu.Trigger>
            </ContextMenu.Root>
          )}
        </>
      </div>
    );
  }, [
    draggingCable,
    visibleObjectNodes,
    objectNodes,
    patch.objectNodes,
    selectedNodes,
    messageNodes,
    selection,
    patch,
    lockedMode,
    presentationMode,
    preDragging,
  ]);

  return out;
});

PatchInner.displayName = "PatchInner";
export default PatchInner;
