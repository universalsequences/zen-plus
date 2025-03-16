import { useCallback, useEffect, useRef } from "react";
import { usePatch } from "@/contexts/PatchContext";
import { usePosition, ResizingNode, DraggingNode } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useLocked } from "@/contexts/LockedContext";
import { useZoom } from "./useZoom";
import { useMessage } from "@/contexts/MessageContext";
import { useTiles } from "./useTiles";
import { getUpdatedSize } from "@/lib/utils";
import { ObjectNode, SubPatch, Orientation } from "@/lib/nodes/types";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { isMessageNode, isObjectNode } from "@/lib/nodes/vm/instructions";

/**
 * Props for the usePatchMouse hook
 */
interface Props {
  isCustomView?: boolean;
}

/**
 * Hook for managing mouse interactions within a patch
 *
 * This hook handles mouse events for:
 * - Creating nodes
 * - Dragging nodes
 * - Resizing nodes
 * - Connecting nodes with cables
 * - Selecting multiple nodes
 * - Segmenting cables
 */
export const usePatchMouse = ({ isCustomView }: Props) => {
  // Context and state hooks
  const { lockedMode } = useLocked();
  const { segmentCable, registerConnection, patch, newObjectNode } = usePatch();
  const { selectedPatch, setSelectedPatch } = usePatches();
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
  const {
    lastResizingTime,
    setSelection,
    selection,
    selectedNodes,
    setSelectedNodes,
    setSelectedConnection,
  } = useSelection();

  // Ref for tracking double-click timing
  const lastClick = useRef(0);

  // Refs for tracking state between renders
  const draggingCableRef = useRef<any | null>(null);
  const draggingNodeRef = useRef<DraggingNode | null>(null);
  const resizingNodeRef = useRef<ResizingNode | null>(null);
  const selectedNodesRef = useRef(selectedNodes);

  // Keep refs in sync with state
  useEffect(() => {
    draggingCableRef.current = draggingCable;
  }, [draggingCable]);

  useEffect(() => {
    draggingNodeRef.current = draggingNode;
    resizingNodeRef.current = resizingNode;
  }, [resizingNode, draggingNode]);

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
  }, [selectedNodes]);

  /**
   * Handle mouse up on nodes
   * Resets resizing and dragging states
   */
  const onMouseUpNode = useCallback(() => {
    if (resizingPatch) {
      setResizingPatch(null);
      return;
    }
    setDraggingNode(null);
    setResizingNode(null);
  }, [setDraggingNode, setResizingNode, setResizingPatch, resizingPatch]);

  /**
   * Handle mouse up in the patch
   * Handles:
   * - Finishing cable connections
   * - Selection of nodes
   * - Resetting dragging states
   */
  const onMouseUp = useCallback(
    (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
      // Handle cable connection when mouse is released over an inlet
      if (nearestInlet && draggingCable) {
        if (draggingCable.sourceNode) {
          // Connect from source node to target inlet
          const destInlet = nearestInlet.node.inlets[nearestInlet.iolet];
          const connection = draggingCable.sourceNode.connect(
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
          // Connect from target outlet to destination node
          const connection = nearestInlet.node.connect(
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

      // Stop propagation if we were dragging a cable
      if (draggingCableRef.current) {
        e.stopPropagation();
        setDraggingCable(null);
        return;
      }

      // Skip further processing in custom view or locked mode
      if (isCustomView || lockedMode) {
        return;
      }

      // Reset dragging segmentation state
      setDraggingSegmentation(null);

      // Select nodes within the selection box
      if (selection && selection.patch === patch) {
        // Get all nodes
        const allNodes = [...patch.objectNodes, ...patch.messageNodes];

        // Filter nodes that are within the selection bounds
        const selectedNodes = allNodes.filter((node) => {
          // Skip locked nodes
          if (node.locked) {
            return false;
          }

          // Get node size
          const nodeSize = sizeIndexRef.current[node.id];
          let width = nodeSize ? nodeSize.width || 100 : 100;
          let height = nodeSize ? nodeSize.height || 7 : 7;

          // Handle special slotview nodes
          if (node.attributes.slotview) {
            width = 180;
            height = 24;
          }

          // Get node position based on presentation mode
          const position = presentationMode
            ? node.presentationPosition || node.position
            : node.position;

          // Check if node is within selection bounds
          return (
            position.x + width >= selection.x1 &&
            position.x <= selection.x2 &&
            position.y + height >= selection.y1 &&
            position.y <= selection.y2
          );
        });

        setSelectedNodes(selectedNodes);
      }
    },
    [
      patch,
      draggingCable,
      nearestInlet,
      setNearestInlet,
      setDraggingCable,
      presentationMode,
      setDraggingSegmentation,
      selection,
      setSelectedNodes,
      lockedMode,
      registerConnection,
      sizeIndexRef,
      isCustomView,
    ],
  );

  /**
   * Scroll to top in custom presentation view
   */
  useEffect(() => {
    if (
      lockedMode &&
      presentationMode &&
      (patch as SubPatch).parentNode &&
      (patch as SubPatch).parentNode.attributes["Custom Presentation"] &&
      scrollRef.current
    ) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [lockedMode, presentationMode, patch, scrollRef]);

  /**
   * Handle mouse move events
   * Handles:
   * - Cable dragging
   * - Patch resizing
   * - Node resizing
   * - Node dragging
   * - Cable segmentation
   */
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      // Handle patch resizing
      if (resizingPatch) {
        onResizePatch(e, lockedMode);
        return;
      }

      // Don't process in custom view, locked mode, or if no scroll ref
      if (isCustomView || lockedMode || !scrollRef.current) {
        return;
      }

      // Get mouse position relative to the scroll container
      const rect = scrollRef.current.getBoundingClientRect();
      const client = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Handle dragging cable - check for nearby inlets
      if (draggingCable) {
        const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
        checkNearInlets(x, y);
        return;
      }

      // Handle cable segmentation
      if (draggingSegmentation) {
        const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
        const id = draggingSegmentation.source.id;
        const node = draggingSegmentation.source as ObjectNode;
        const height = node.size ? node.size.height : sizeIndexRef.current[id].height;

        if (height) {
          segmentCable(draggingSegmentation, y - height);
        }
        return;
      }

      // Handle node resizing
      if (resizingNodeRef.current) {
        lastResizingTime.current = new Date().getTime();
        const { node, orientation } = resizingNodeRef.current;
        const position = presentationMode
          ? node.presentationPosition || node.position
          : node.position;

        // Ensure node has size object
        if (!node.size) {
          node.size = sizeIndexRef.current[node.id];
        }

        // Handle width-only resize
        if (orientation === Orientation.X) {
          if (isObjectNode(node)) {
            const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
            const width = x - position.x;
            node.size.width = width;
            updateSize(node.id, { ...node.size });
          }
        }
        // Handle height-only resize
        else if (orientation === Orientation.Y) {
          if (isObjectNode(node)) {
            const y = scrollRef.current.scrollTop + client.y;
            const height = y - position.y;
            node.size.height = height;
            updateSize(node.id, { ...node.size });

            if ((node as ObjectNode).updateSize) {
              (node as ObjectNode).updateSize({ ...node.size });
            }
          }
        }
        // Handle width and height resize
        else {
          const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
          const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
          const width = x - position.x;
          const height = y - position.y;

          if (isObjectNode(node)) {
            node.size.width = width;
            if (
              node instanceof ObjectNodeImpl &&
              (node.name === "zen" || (node as ObjectNode).isResizable)
            ) {
              node.size.height = height;
            }
            updateSize(node.id, { ...node.size });

            if ((node as ObjectNode).updateSize) {
              (node as ObjectNode).updateSize({ ...node.size });
            }
          }

          // Resize all selected nodes to the same dimensions
          for (const selectedNode of selectedNodes) {
            if (isMessageNode(selectedNode)) continue;
            if ((selectedNode as ObjectNode).size) {
              const objNode = selectedNode as ObjectNode;
              if (objNode.size) {
                objNode.size.width = width;
                if (objNode.name === "zen" || objNode.isResizable) {
                  objNode.size.height = height;
                }
                updateSize(objNode.id, { ...objNode.size });

                if (objNode.updateSize) {
                  objNode.updateSize({ ...objNode.size });
                }
              }
            }
          }
        }
        return;
      }

      // Handle node dragging
      if (draggingNodeRef.current) {
        const { node, offset } = draggingNodeRef.current;

        // Ensure at least one node is selected
        if (selectedNodesRef.current.length === 0) {
          setSelectedNodes([node]);
        }

        // Calculate new position
        let x = (scrollRef.current.scrollLeft + client.x - offset.x) / zoomRef.current;
        let y = (scrollRef.current.scrollTop + client.y - offset.y) / zoomRef.current;

        // Get the current position based on presentation mode
        const position = presentationMode
          ? node.presentationPosition || node.position
          : node.position;

        // Calculate the movement difference
        const diffX = x - position.x;
        const diffY = y - position.y;

        // Update the primary dragged node position
        position.x = Math.max(0, x);
        position.y = Math.max(0, y);

        // Track all node updates
        const updates: Record<string, any> = {};
        const nodeMap: Record<string, any> = {};

        // Update all selected nodes
        for (const selectedNode of selectedNodesRef.current) {
          // Update cable segmentation for multi-selection
          if (selectedNodesRef.current.length > 1) {
            for (const outlet of selectedNode.outlets) {
              for (const connection of outlet.connections) {
                if (connection.segmentation) {
                  connection.segmentation += diffY;
                }
              }
            }
          }

          // Update positions of other selected nodes
          if (node !== selectedNode) {
            const nodePosition = presentationMode
              ? selectedNode.presentationPosition || selectedNode.position
              : selectedNode.position;

            nodePosition.x = Math.max(0, nodePosition.x + diffX);
            nodePosition.y = Math.max(0, nodePosition.y + diffY);
            updates[selectedNode.id] = { ...nodePosition };
          }

          nodeMap[selectedNode.id] = selectedNode;
        }

        // Add the primary dragged node to updates
        updates[node.id] = { ...position };

        // Update all node positions
        updatePositions(updates);

        // Apply updates to node objects
        for (const id in updates) {
          const updatedNode = nodeMap[id];
          if (updatedNode) {
            if (presentationMode) {
              updatedNode.presentationPosition = updates[id];
            } else {
              updatedNode.position = updates[id];
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
      updatePositions,
      scrollRef,
      selectedNodes,
      updateSize,
      lockedMode,
      isCustomView,
      zoomRef,
      checkNearInlets,
      onResizePatch,
      segmentCable,
      sizeIndexRef,
      setSelectedNodes,
    ],
  );

  /**
   * Reset dragging when locked mode changes
   */
  useEffect(() => {
    if (lockedMode) {
      setDraggingNode(null);
    }
  }, [lockedMode, setDraggingNode]);

  /**
   * Update patch selection state
   */
  useEffect(() => {
    patch.isSelected = patch === selectedPatch;
  }, [patch, selectedPatch]);

  /**
   * Set up global mouse event listeners
   */
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUpNode);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUpNode);
    };
  }, [onMouseMove, onMouseUpNode]);

  /**
   * Update selection while mouse is moving over patch
   */
  const onSelectionMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!scrollRef.current || !selection) {
        return;
      }

      // Get mouse position
      const rect = scrollRef.current.getBoundingClientRect();
      const client = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Calculate position in the patch coordinate system
      const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
      const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

      // Update selection rectangle
      setSelection({
        ...selection,
        patch: patch,
        x2: x,
        y2: y,
      });
    },
    [setSelection, selection, patch, scrollRef, zoomRef],
  );

  /**
   * Handle mouse down in the patch
   * Starts a new selection rectangle
   */
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip in custom view or on right click
      if (isCustomView || e.button === 2) {
        return;
      }

      // Set this patch as selected
      setSelectedPatch(patch);
      patch.onNewMessage = onNewMessage;

      // Start a new selection rectangle if not in locked mode
      if (scrollRef.current && !lockedMode) {
        const rect = scrollRef.current.getBoundingClientRect();
        const client = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

        setSelection({
          patch: patch,
          x1: x,
          y1: y,
          x2: x,
          y2: y,
        });
      }
    },
    [setSelection, onNewMessage, lockedMode, patch, setSelectedPatch, scrollRef, zoomRef],
  );

  /**
   * Handle click in the patch
   * Selects the patch and creates a new node on double-click
   */
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip in custom view or on right click
      if (isCustomView || e.button === 2) {
        return;
      }

      // Set this patch as selected
      setSelectedPatch(patch);

      // Skip if during resizing
      const now = new Date().getTime();
      if (now - lastResizingTime.current < 200) {
        return;
      }

      // Create a new node on double-click
      if (now - lastClick.current < 350 && scrollRef.current) {
        // Get mouse position in patch coordinates
        const rect = scrollRef.current.getBoundingClientRect();
        const client = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        const x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        const y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

        // Create new object node at this position
        const objectNode = new ObjectNodeImpl(patch);
        const position = { x, y };

        objectNode.created = true;
        newObjectNode(objectNode, position);
        updatePosition(objectNode.id, position);
        setSelection(null);
        setSize(getUpdatedSize(objectNode, size));
      }

      // Update last click time
      lastClick.current = now;
    },
    [
      setSelectedPatch,
      patch,
      lastResizingTime,
      scrollRef,
      zoomRef,
      newObjectNode,
      updatePosition,
      setSelection,
      setSize,
      size,
      isCustomView,
    ],
  );

  // Return the public API of this hook
  return {
    onClick,
    onMouseUp,
    onSelectionMove,
    onMouseDown,
    setResizingPatch,
    resizingPatch,
  };
};
