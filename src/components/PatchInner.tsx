import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNodeOperations } from "@/hooks/useEncapsulation";
import { usePatchOrganizer } from "@/hooks/usePatchOrganizer";
import { useZoom } from "@/hooks/useZoom";
import { usePatchLoader } from "@/hooks/usePatchLoader";
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
  zoomRef?: React.MutableRefObject<number>;
  zoomableRef?: React.MutableRefObject<HTMLDivElement | null>;
  visibleObjectNodes?: ObjectNode[];
  messageNodes?: MessageNode[];
  index: number;
  isCustomView?: boolean;
  patch?: any; // Optional patch prop to support direct patch passing
  fileToOpen?: any | null;
  setFileToOpen?: (x: any | null) => void;
}> = React.memo(
  ({
    isSelected,
    zoomRef,
    zoomableRef,
    visibleObjectNodes,
    index,
    isCustomView,
    patch: propPatch,
    fileToOpen,
    setFileToOpen,
  }) => {
    // Create refs if they weren't provided
    const defaultZoomRef = useRef(1);
    const defaultZoomableRef = useRef<HTMLDivElement | null>(null);

    // Use provided refs or defaults
    const actualZoomRef = zoomRef || defaultZoomRef;
    const actualZoomableRef = zoomableRef || defaultZoomableRef;
    useEffect(() => {
      // If we've been provided a zoom ref from a parent, copy our value to it
      if (zoomRef && zoomRef.current !== actualZoomRef.current) {
        zoomRef.current = actualZoomRef.current;
      }
    }, [zoomRef, actualZoomRef]);
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

    // Ensure scrollRef.current matches actualZoomableRef.current's parent
    useEffect(() => {
      if (actualZoomableRef.current && actualZoomableRef.current.parentElement) {
        scrollRef.current = actualZoomableRef.current.parentElement as any;
      }
    }, [actualZoomableRef, scrollRef]);

    // If propPatch is provided, use it instead of the context patch
    const patchContext = usePatch();
    const {
      segmentCables,
      updateConnections,
      patch: contextPatch,
      objectNodes: contextObjectNodes,
      messageNodes: contextMessageNodes,
      newObjectNode,
    } = patchContext;

    // Use propPatch if provided, otherwise use the context patch
    const patch = propPatch || contextPatch;
    const objectNodes = propPatch ? propPatch.objectNodes : contextObjectNodes;
    const messageNodes = propPatch ? propPatch.messageNodes : contextMessageNodes;

    // Use the usePatchLoader hook
    const loadPatch = usePatchLoader(patch);

    // Load patch from file if needed
    useEffect(() => {
      if (fileToOpen && !(patch as SubPatch).parentPatch && loadPatch && setFileToOpen) {
        loadPatch(fileToOpen);
        setFileToOpen(null);
      }
    }, [fileToOpen, patch, loadPatch, setFileToOpen]);

    useEffect(() => {
      patch.onNewMessage = onNewMessage;
    }, [patch, onNewMessage]);

    // useKeyBindings(scrollRef);

    const lastClick = useRef(0);
    const zoomableId = useRef(
      `zoomable-area-${patch?.id || Math.random().toString(36).substring(7)}`,
    );

    const draggingNodeRef = useRef<DraggingNode | null>(null);
    const resizingNodeRef = useRef<ResizingNode | null>(null);

    useEffect(() => {
      draggingNodeRef.current = draggingNode;
      resizingNodeRef.current = resizingNode;
    }, [resizingNode, draggingNode]);

    const selectedNodesRef = useRef(selectedNodes);

    useEffect(() => {
      selectedNodesRef.current = selectedNodes;
    }, [selectedNodes]);

    useEffect(() => {
      if (lockedMode) {
        setDraggingNode(null);
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
      zoomRef: actualZoomRef,
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
            ref={actualZoomableRef}
            id={zoomableId.current}
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
              .filter((x: ObjectNode) => {
                if (!preDragging || !actualZoomableRef.current) {
                  return true;
                }
                let width = x.size ? x.size.width : 100;
                return x.position.x + width < actualZoomableRef.current.offsetWidth;
              })
              .filter((x: ObjectNode) =>
                presentationMode ? x.attributes["Include in Presentation"] : true,
              )
              .map((objectNode: ObjectNode, index: number) =>
                objectNode.name === "outputs" ? (
                  ""
                ) : (
                  <ObjectNodeWrapper key={objectNode.id} objectNode={objectNode} />
                ),
              )}
            {messageNodes
              .filter((x: MessageNode) => {
                if (!preDragging || !actualZoomableRef.current) {
                  return true;
                }
                return x.position.x < actualZoomableRef.current.offsetWidth;
              })
              .filter((x: MessageNode) =>
                presentationMode ? x.attributes["Include in Presentation"] : true,
              )
              .map((messageNode: MessageNode, index: number) => (
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
      fileToOpen,
      setFileToOpen,
    ]);

    return out;
  },
);

PatchInner.displayName = "PatchInner";
export default PatchInner;
