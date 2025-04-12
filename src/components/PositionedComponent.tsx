import React, { useRef, useEffect, useCallback } from "react";
import { useMessage } from "@/contexts/MessageContext";
import { index } from "./ux/index";
import IOletsComponent from "./IOletsComponent";
import { SLOT_VIEW_HEIGHT, SLOT_VIEW_WIDTH } from "./SlotView";
import {
  Orientation,
  MessageType,
  type ObjectNode,
  type MessageNode,
  type Coordinate,
} from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { usePositionStyle } from "@/hooks/usePositionStyle";
import { OperatorContextType } from "@/lib/nodes/context";
import { usePatch } from "@/contexts/PatchContext";
import { usePatchSelector } from "../hooks/usePatchSelector";
import { isMessageNode, isObjectNode } from "@/lib/nodes/vm/instructions";
import { usePatches } from "@/contexts/PatchesContext";

/**
 * Props for PositionedComponent
 */
interface PositionedComponentProps {
  position?: string; // Position type (absolute or relative)
  fullscreen?: boolean; // Whether the component is in fullscreen mode
  isHydrated?: boolean; // Whether the node has received a message
  isCustomView?: boolean; // Whether this is rendered in a custom view
  isError?: boolean; // Whether the node has an error
  text?: string; // Text content of the node
  lockedModeRef: React.MutableRefObject<boolean>; // Whether the patch is locked
  skipOverflow?: boolean; // Whether to skip overflow hiding
  children: React.ReactNode; // Child components
  node: ObjectNode | MessageNode; // The node to position
}

/**
 * PositionedComponent handles the positioning, resizing, and selection behavior
 * of nodes in the patch editor.
 *
 * It provides the common container for all node types (ObjectNode, MessageNode)
 * with selection handles, resize controls, and IOlets.
 */
const PositionedComponent: React.FC<PositionedComponentProps> = ({
  position,
  fullscreen,
  text,
  node,
  isCustomView,
  children,
  isError,
  skipOverflow,
  lockedModeRef,
  isHydrated,
}) => {
  // Context hooks
  const { selectPatch } = usePatchSelector();
  const { patch, buffer } = usePatch();
  const { setSelectedBuffer } = usePatches();
  const { setSelectedNodes, selectedNodes } = useSelection();
  const {
    nearestInlet,
    sizeIndex,
    setDraggingNode,
    setResizingNode,
    resizingNode,
    updateSize,
    updateZIndex,
    maxZIndex,
  } = usePosition();

  // State and refs
  const isResizing = resizingNode?.node === node;
  const ref = useRef<HTMLDivElement | null>(null);
  const initialPosition = useRef<Coordinate | null>(null);
  const maxZIndexRef = useRef(maxZIndex);
  const lastText = useRef(text);
  const selectedNodesRef = useRef<(ObjectNode | MessageNode)[]>([]);

  // Get position styling
  const style = usePositionStyle(node, isCustomView);

  // Initialize message listener
  useMessage();

  // Keep refs in sync with state
  useEffect(() => {
    maxZIndexRef.current = maxZIndex;
  }, [maxZIndex]);

  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
  }, [selectedNodes]);

  /**
   * Update node size when text changes
   */
  useEffect(() => {
    // Skip if node is a message or text hasn't changed
    if (text === lastText.current) return;
    lastText.current = text;

    // Skip for dividers or undefined node types
    const name = (node as ObjectNode).name;
    if (name === undefined || name === "divider") {
      return;
    }

    // Update size based on node type and view mode
    if (!isCustomView && ref.current && !(node as ObjectNode).attributes["Custom Presentation"]) {
      const objectNode = node as ObjectNode;
      const isResizableNodeType =
        objectNode.isResizable ||
        ["scope~", "umenu", "slots", "wasmviewer", "button"].includes(objectNode.name || "") ||
        isMessageNode(node);

      if (isResizableNodeType && node.size) {
        // For resizable nodes, keep existing size
        updateSize(node.id, { ...node.size });
      } else if (!isMessageNode(node)) {
        console.log("standard resize");
        // For standard nodes, size to content
        const size = {
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        };
        node.size = size;
        updateSize(node.id, size);
      }
    }
  }, [node.attributes, text, node, updateSize, isCustomView]);

  /**
   * Start resizing the node when a resize handle is grabbed
   */
  const startResizing = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, orientation: Orientation) => {
      e.stopPropagation();

      if (ref.current) {
        // Track mouse position for resize calculation
        const mousePosition = {
          x: e.clientX,
          y: e.clientY,
        };

        // Set resizing state
        setResizingNode({
          node: node,
          offset: mousePosition,
          origin: { ...node.position },
          orientation: orientation,
        });
      }
    },
    [node, setResizingNode],
  );

  /**
   * Handle mouse down on the node
   * Controls selection and dragging behavior
   */
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip for locked nodes
      if (node.locked) {
        return;
      }

      const currentSelectedNodes = selectedNodesRef.current;

      // Handle shift key for multi-selection
      if (e.shiftKey) {
        e.stopPropagation();
        if (!currentSelectedNodes.includes(node)) {
          setSelectedNodes([...currentSelectedNodes, node]);
        }
        return;
      }

      // Calculate mouse position relative to the node
      if (ref.current) {
        const x = e.clientX - ref.current.getBoundingClientRect().left;
        const y = e.clientY - ref.current.getBoundingClientRect().top;

        // Handle special case for zen nodes with custom presentation
        const objectNode = node as ObjectNode;
        const isZenCustom =
          objectNode.name === "zen" &&
          objectNode.attributes["Custom Presentation"] &&
          !objectNode.attributes["slotview"];

        // Handle custom view or custom zen patch
        if (isCustomView || isZenCustom) {
          if (isZenCustom) {
            e.stopPropagation();
          }

          // Clear selection if node is not already selected
          if (!currentSelectedNodes.includes(node)) {
            setSelectedNodes([]);
          }

          // Start dragging
          setDraggingNode({
            node: node,
            offset: { x, y },
            origin: { ...node.position },
          });

          return;
        }

        // Select the patch this node belongs to
        selectPatch();
        e.stopPropagation();

        // Select the node if not already selected
        if (!currentSelectedNodes.includes(node)) {
          setSelectedNodes([node]);
        }

        // Skip additional processing in locked mode
        if (lockedModeRef.current) {
          e.stopPropagation();
          return;
        }

        // Store initial position for tracking movement
        initialPosition.current = { ...node.position };

        // Start dragging
        setDraggingNode({
          node: node,
          offset: { x, y },
          origin: { ...node.position },
        });

        // Bring node to front (unless it's fixed at back)
        if (node.zIndex !== -1) {
          node.zIndex = maxZIndexRef.current + 1;
          updateZIndex(node.id, node.zIndex);
        }
      }
    },
    [node, setDraggingNode, setSelectedNodes, selectPatch, isCustomView, updateZIndex],
  );

  /**
   * Handle clicks on the node (separate from mouse down)
   */
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (buffer) {
        setSelectedBuffer(buffer);
      }
      // Skip for locked nodes
      if (node.locked) {
        return;
      }

      const currentSelectedNodes = selectedNodesRef.current;

      // Stop propagation if we have a reference
      if (ref.current) {
        e.stopPropagation();
      }

      // Skip in custom view
      if (isCustomView) {
        return;
      }

      // In locked mode, only allow selection if node has onPatchSelect handler
      const hasSelectHandler = (node as ObjectNode).subpatch?.objectNodes.some(
        (x) => x.name === "onPatchSelect",
      );
      if (lockedModeRef.current && !hasSelectHandler) {
        return;
      }

      // Handle selection toggling
      if (!currentSelectedNodes.includes(node)) {
        if (e.shiftKey) {
          // Toggle selection with shift key
          setSelectedNodes((prev) =>
            prev.includes(node) ? prev.filter((x) => x !== node) : [...prev, node],
          );
        } else {
          // Single select
          setSelectedNodes([node]);
        }
      }
    },
    [node, setSelectedNodes, isCustomView],
  );

  // Get current size (from node or size index)
  const size = node.size || sizeIndex[node.id];

  // Memoize the rendered component to prevent unnecessary re-renders
  return React.useMemo(() => {
    // Calculate minimum width based on inlets
    let minWidth = Math.max(15, node.inlets.length * 15);
    if (size && size.width > minWidth) {
      minWidth = size.width;
    }

    // Determine if this is a custom component
    const isCustom = index[(node as ObjectNode).name || ""] !== undefined;

    // Determine overflow behavior
    const shouldSkipOverflow =
      skipOverflow ||
      (node.attributes["scripting name"] !== undefined && node.attributes["scripting name"] !== "");

    // Build class name based on node properties
    let className = [
      // Base styling
      isCustom ? "" : "h-6_5 border bg-black-clear",
      position || "absolute",
      "node-component text-black text-xs flex",
      shouldSkipOverflow ? "overflow-visible" : "overflow-hidden hover:overflow-visible",
      "border",
    ].join(" ");

    // Add subpatch class if applicable
    if ((node as ObjectNode).subpatch) {
      className += " node-subpatch-component";
    }

    // Handle message node styling
    if ((node as MessageNode).messageType === MessageType.Message) {
      className += " rounded-md";
      minWidth = 20;
      className = className.replace("h-6_5", "h-6");
      className += " bg-zinc-600";
      className = className.replace("bg-black-clear", "");
      className += " pushable message-node";
    }

    // Handle number node styling
    if ((node as MessageNode).messageType === MessageType.Number) {
      className = className.replace("bg-black-clear", "");
    }

    // Check if node is selected
    const isSelected = selectedNodes.includes(node);

    // Special case for button nodes
    if ((node as ObjectNode).name === "button") {
      minWidth = 5;
    }

    // Special case for divider nodes
    if ((node as ObjectNode).name === "divider") {
      minWidth = 1;
      if (!isSelected) {
        className = className.replaceAll("border", "");
      }
    }

    // Styling based on selection state
    if (!isSelected) {
      // Handle special node types
      const objectNode = node as ObjectNode;
      const name = objectNode.name;

      if (name === "comment" || name === "slider" || name === "knob") {
        className += " comment";
        className = className.replace("border", "");
      } else {
        className += " border-black";
      }
    } else if (position !== "relative") {
      className += " border-zinc-100";
    }

    // Add selected class
    if (isSelected && position !== "relative" && !buffer) {
      className += " selected";
    }

    // Remove borders in relative positioning
    if (position === "relative") {
      className = className.replaceAll("border", "");
    }

    // Add operator context type class
    if ((node as ObjectNode).operatorContextType && !isCustom) {
      className += " context-type-" + (node as ObjectNode).operatorContextType;
    }

    // Build style object
    let nodeStyle: any = {
      ...style,
      minWidth: `${minWidth}px`,
    };

    // Handle special node sizes
    const objectNode = node as ObjectNode;
    const nodeSize = objectNode.size;

    // Special sizing for certain node types
    if (
      objectNode.name === "slider" ||
      objectNode.name === "knob" ||
      objectNode.operatorContextType === OperatorContextType.NUMBER
    ) {
      nodeStyle.minWidth = "unset";
    }

    // Determine if node should allow size modifications
    let allowSize = false;

    // Handle custom presentation nodes
    if (objectNode.attributes["Custom Presentation"] && nodeSize) {
      nodeStyle.width = nodeSize.width;
      nodeStyle.height = nodeSize.height;
      allowSize = true;
    } else if (
      nodeSize &&
      ((objectNode as ObjectNode).name === "zen" || (objectNode as ObjectNode).isResizable)
    ) {
      allowSize = true;
      nodeStyle.width = nodeSize.width + 2;
      nodeStyle.height = nodeSize.height + 2;
    }

    // Handle divider sizing
    if (objectNode.name === "divider" && nodeSize) {
      nodeStyle.width = nodeSize.width;
      nodeStyle.height = nodeSize.height;
      allowSize = true;
    }

    if (isMessageNode(node)) {
      allowSize = true;
      if (nodeSize) nodeStyle.width = nodeSize.width;
    }

    // Add error class
    if (isError) {
      className += " has-error";
    }

    // Remove overflow hidden when inlet is highlighted
    if (nearestInlet && nearestInlet.node === node) {
      className = className.replaceAll("overflow-hidden", "");
    }

    // Add hydrated class
    if (isHydrated) {
      className += " hydrated";
    }

    // Handle slot view sizing
    if (node.attributes.slotview) {
      nodeStyle.width = SLOT_VIEW_WIDTH;
      nodeStyle.minWidth = SLOT_VIEW_WIDTH + "px";
      nodeStyle.maxWidth = SLOT_VIEW_WIDTH + "px";
      nodeStyle.height = SLOT_VIEW_HEIGHT;
    }

    // Increase z-index for selected nodes
    if (isSelected && node.zIndex !== -1) {
      nodeStyle.zIndex = 100000000000;
    }

    // Handle fullscreen mode
    if (fullscreen || buffer) {
      nodeStyle.width = "99.8%";
      nodeStyle.height = buffer ? "100%" : "100vh";
      nodeStyle.left = 0;
      nodeStyle.top = 0;
      nodeStyle.zIndex = 10000000000000;
      if (!buffer) className = "fixed top-0 left-0";
    }

    // Handle relative positioning
    if (position === "relative") {
      nodeStyle.left = 0;
      nodeStyle.top = 0;
    }

    return (
      <div
        ref={ref}
        onClick={onClick}
        onMouseDown={onMouseDown}
        style={nodeStyle}
        className={className}
      >
        {/* Selection controls and resize handles */}
        {!buffer && isSelected && (
          <ResizeHandles
            node={node}
            allowSize={allowSize}
            isCustom={isCustom}
            startResizing={startResizing}
          />
        )}

        {/* Input IOlets */}
        {!isResizing && !buffer && !fullscreen && !isCustomView && position !== "relative" && (
          <IOletsComponent
            text={text}
            isOutlet={false}
            className="absolute flex -top-1"
            node={node}
            iolets={node.inlets}
          />
        )}

        {/* Instruction indicator */}
        {node?.instructions && (
          <div className="w-1 h-1 bg-red-4500 rounded-full absolute top-0 right-0" />
        )}

        {/* Output IOlets */}
        {!isResizing && !fullscreen && !isCustomView && position !== "relative" && (
          <IOletsComponent
            text={text}
            isOutlet={true}
            className="absolute flex -bottom-1"
            node={node}
            iolets={node.outlets}
          />
        )}

        {/* Node content */}
        {children}
      </div>
    );
  }, [
    isResizing,
    node,
    isError,
    size,
    children,
    style,
    text,
    nearestInlet,
    node.attributes.slotview,
    fullscreen,
    selectedNodes,
    onClick,
    onMouseDown,
    startResizing,
    isCustomView,
  ]);
};

/**
 * Props for ResizeHandles component
 */
interface ResizeHandlesProps {
  node: ObjectNode | MessageNode;
  allowSize: boolean;
  isCustom: boolean;
  startResizing: (e: React.MouseEvent<HTMLDivElement>, orientation: Orientation) => void;
}

/**
 * Component for rendering resize handles on selected nodes
 */
const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  node,
  allowSize,
  isCustom,
  startResizing,
}) => {
  const isDivider = (node as ObjectNode).name === "divider";
  const isDividerVertical = node.attributes["orientation"] === "vertical";
  const showVerticalResize = (isDivider ? isDividerVertical : true) && (allowSize || isCustom);
  const showHorizontalResize = isDivider ? !isDividerVertical : true;

  return (
    <>
      {/* Corner markers */}
      <div className="absolute top-0 right-0 w-1 h-1 bg-zinc-300" />
      <div className="absolute top-0 left-0 w-1 h-1 bg-zinc-300 resize-selector" />
      <div className="absolute bottom-0 left-0 w-1 h-1 bg-zinc-300 resize-selector" />

      {/* Corner resize handle */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => startResizing(e, Orientation.XY)}
        style={allowSize ? { width: 10, height: 10 } : { maxWidth: 25, maxHeight: 25 }}
        className="absolute bottom-0 right-0 w-2 h-2 bg-zinc-300 cursor-se-resize z-30 resize-selector"
      />

      {/* Bottom resize handle (height) */}
      {showVerticalResize && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => startResizing(e, Orientation.Y)}
          className={`absolute bottom-0 left-0 h-0.5 w-full cursor-ns-resize z-10 resize-selector ${isCustom ? "" : ""}`}
        />
      )}

      {/* Right resize handle (width) */}
      {showHorizontalResize && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => startResizing(e, Orientation.X)}
          className={`absolute top-0 right-0 w-0.5 h-full cursor-ew-resize z-10 resize-selector ${isCustom ? "" : ""}`}
        />
      )}
    </>
  );
};

export default PositionedComponent;
