import { usePatch } from "@/contexts/PatchContext";
import { usePosition, ResizingNode, DraggingNode } from "@/contexts/PositionContext";
import { useCallback, useEffect, useRef } from "react";
import { useTiles } from "./useTiles";
import { useSelection } from "@/contexts/SelectionContext";
import { getUpdatedSize } from "@/lib/utils";
import { usePatches } from "@/contexts/PatchesContext";
import { useLocked } from "@/contexts/LockedContext";
import { ObjectNode, SubPatch, Orientation } from "@/lib/nodes/types";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { useZoom } from "./useZoom";
import { useMessage } from "@/contexts/MessageContext";

interface Props {
  isCustomView?: boolean;
}
export const usePatchMouse = ({ isCustomView }: Props) => {
  const { lockedMode } = useLocked();

  const { segmentCable, registerConnection, patch, objectNodes, messageNodes, newObjectNode } =
    usePatch();

  const { selectedPatch, setSelectedPatch, setGridTemplate } = usePatches();

  const { onNewMessage } = useMessage();

  const { onResizePatch, resizingPatch, setResizingPatch } = useTiles(patch);
  const {
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

  const { zoomRef } = useZoom(scrollRef, isCustomView);

  const lastClick = useRef(0);

  let draggingCableRef = useRef<any | null>(null);
  useEffect(() => {
    draggingCableRef.current = draggingCable;
  }, [draggingCable]);

  const {
    lastResizingTime,
    setSelection,
    selection,
    selectedNodes,
    setSelectedNodes,
    setSelectedConnection,
  } = useSelection();

  const onMouseUpNode = useCallback(
    (_e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
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
        onResizePatch(e, lockedMode);
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
        let height = node.size ? node.size.height : sizeIndexRef.current[id].height;
        if (height) {
          segmentCable(draggingSegmentation, y - height);
        }
      }
      if (resizingNodeRef.current) {
        lastResizingTime.current = new Date().getTime();
        if (resizingNodeRef.current.orientation === Orientation.X) {
          let { node } = resizingNodeRef.current;
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current; // - offset.x;
          if (!node.size) {
            node.size = sizeIndexRef.current[node.id];
            // position`
          } else {
          }
          let width = x - position.x;
          node.size.width = width;
          updateSize(node.id, { ...node.size });
        } else if (resizingNodeRef.current.orientation === Orientation.Y) {
          let { node } = resizingNodeRef.current;
          let position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;
          let y = scrollRef.current.scrollTop + client.y; //- offset.y;
          if (!node.size) {
            node.size = sizeIndexRef.current[node.id];
            // position`
          }
          let height = y - position.y;
          node.size.height = height;
          updateSize(node.id, { ...node.size });
        } else {
          let { node } = resizingNodeRef.current;
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
    }
  }, [lockedMode, setSelectedNodes, setDraggingNode, selectedPatch]);

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
    [setSelectedNodes, size, setSize, selection, setSelectedConnection, setSelection, patch],
  );

  return {
    onClick,
    onMouseUp,
    onSelectionMove,
    onMouseDown,
    setResizingPatch,
  };
};
