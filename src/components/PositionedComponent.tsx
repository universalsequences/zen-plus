import React, { useRef, useState, useEffect, useCallback } from "react";
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
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";

const PositionedComponent: React.FC<{
  fullscreen?: boolean;
  isHydrated?: boolean;
  isCustomView?: boolean;
  isError?: boolean;
  text?: string;
  lockedModeRef: React.MutableRefObject<boolean>;
  skipOverflow?: boolean;
  children: React.ReactNode;
  node: ObjectNode | MessageNode;
}> = ({
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
  const { setSelectedPatch } = usePatches();
  const { patch } = usePatch();
  const { setSelectedNodes, selectedNodes } = useSelection();
  const {
    nearestInlet,
    sizeIndex,
    setDraggingNode,
    setResizingNode,
    updateSize,
    updateZIndex,
    maxZIndex,
  } = usePosition();

  const ref = useRef<HTMLDivElement | null>(null);

  const style = usePositionStyle(node, isCustomView);

  const initialPosition = useRef<Coordinate | null>(null);

  useMessage();

  const maxZIndexRef = useRef(maxZIndex);
  useEffect(() => {
    maxZIndexRef.current = maxZIndex;
  }, [maxZIndex]);

  useEffect(() => {
    let name = (node as ObjectNode).name;
    if (
      ((node as MessageNode).message === undefined && name === undefined) ||
      name == "divider"
    ) {
      return;
    }
    if (
      !isCustomView &&
      ref.current &&
      !(node as ObjectNode).attributes["Custom Presentation"]
    ) {
      if (
        ((node as ObjectNode).isResizable ||
          (node as ObjectNode).name === "scope~" ||
          (node as ObjectNode).name === "umenu" ||
          (node as ObjectNode).name === "slots" ||
          (node as ObjectNode).name === "wasmviewer" ||
          (node as ObjectNode).name === "matrix" ||
          (node as ObjectNode).name === "button") &&
        node.size
      ) {
        if (node.size) {
          updateSize(node.id, {
            ...node.size,
          });
        }
      } else {
        const size = {
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        };
        node.size = size;
        updateSize(node.id, {
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    } else if (node.size) {
    } else {
      if ((node as MessageNode).message !== undefined) {
        return;
      }
    }
  }, [node.attributes, text]);

  const startResizing = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement, MouseEvent>,
      orientation: Orientation,
    ) => {
      e.stopPropagation();
      let divRect = ref.current?.getBoundingClientRect();
      if (divRect) {
        let x = e.clientX; // - divRect.left;
        let y = e.clientY; // - divRect.top

        setResizingNode({
          node: node,
          offset: { x, y },
          origin: { ...node.position },
          orientation: orientation,
        });
      }
    },
    [setResizingNode],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (isCustomView) {
        return;
      }
      if (lockedModeRef.current) {
        return;
      }
      e.stopPropagation();
      let divRect = ref.current?.getBoundingClientRect();
      if (divRect) {
        let x = e.clientX - divRect.left;
        let y = e.clientY - divRect.top;

        if (!selectedNodes.includes(node)) {
          if (e.shiftKey) {
            setSelectedNodes((prev) =>
              prev.includes(node)
                ? prev.filter((x) => x !== node)
                : [...prev, node],
            );
          } else {
            setSelectedNodes([node]);
          }
          setSelectedPatch(patch);
        }

        initialPosition.current = { ...node.position };

        setDraggingNode({
          node: node,
          offset: { x, y },
          origin: { ...node.position },
        });

        node.zIndex = maxZIndexRef.current + 1;
        updateZIndex(node.id, node.zIndex);
      }
    },
    [setDraggingNode, selectedNodes, patch],
  );

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      let divRect = ref.current?.getBoundingClientRect();
      if (divRect) {
        e.stopPropagation();
      }
    },
    [setDraggingNode, setSelectedNodes, node, maxZIndex],
  );

  const size = sizeIndex[node.id];
  const out = React.useMemo(() => {
    let minWidth = Math.max(15, node.inlets.length * 15);
    if (size && size.width > minWidth) {
      minWidth = size.width;
    } else {
    }
    const isCustom = index[(node as ObjectNode).name || ""] !== undefined;
    let _skipOverflow =
      node.attributes["scripting name"] !== undefined &&
      node.attributes["scripting name"] !== "";
    if (skipOverflow) {
      _skipOverflow = true;
    }
    let className =
      (isCustom ? "" : "h-6_5 border bg-black-clear") +
      ` absolute  node-component text-black text-xs flex ${_skipOverflow ? "overflow-visible" : "overflow-hidden"} hover:overflow-visible border `;
    if ((node as MessageNode).messageType === MessageType.Message) {
      className += " rounded-md";
      minWidth = 20;
      className = className.replace("h-6_5", "h-6");
      className += " bg-zinc-600";
      className = className.replace("bg-black-clear", "");
      className += " pushable";
      className += " message-node";
    }
    let isSelected = selectedNodes.includes(node);
    if ((node as ObjectNode).name === "button") {
      minWidth = 5;
    }
    if ((node as ObjectNode).name === "divider") {
      minWidth = 1;
      if (!isSelected) {
        className = className.replaceAll("border", "");
      }
    }
    if (!isSelected) {
      let _n = node as ObjectNode;
      let name = _n.name;
      if (name === "comment" || name === "slider" || name === "knob") {
        className += " comment ";
        className = className.replace("border", "");
      } else {
        className += " border-zinc-900";
      }
    } else {
      className += " border-zinc-100";
    }

    if (isSelected) {
      className += " selected";
    }

    if ((node as ObjectNode).operatorContextType && !isCustom) {
      className += " context-type-" + (node as ObjectNode).operatorContextType;
    }

    let _style: any = {
      ...style,
      minWidth: `${minWidth}px`,
    };
    let _size = (node as ObjectNode).size;
    if (
      ((node as ObjectNode).isResizable,
      (node as ObjectNode).name === "slider" ||
        (node as ObjectNode).name === "knob" ||
        (node as ObjectNode).operatorContextType === OperatorContextType.NUMBER)
    ) {
      _style.minWidth = "unset";
    }
    let allowSize = false;
    if ((node as ObjectNode).attributes["Custom Presentation"] && _size) {
      _style.width = _size.width;
      _style.height = _size.height;
      allowSize = true;
    } else if ((node as ObjectNode).name === "zen" && _size) {
      allowSize = true;
      _style.width = _size.width;
      _style.height = _size.height;
    }

    if ((node as ObjectNode).name === "divider" && _size) {
      _style.width = _size.width;
      _style.height = _size.height;
      allowSize = true;
    }

    if (isError) {
      className += " has-error";
    }

    if (nearestInlet && nearestInlet.node === node) {
      className = className.replaceAll("overflow-hidden", "");
    }

    if (isHydrated) {
      className += " hydrated";
    }

    if (node.attributes.slotview) {
      _style.width = SLOT_VIEW_WIDTH;
      _style.minWidth = SLOT_VIEW_WIDTH + "px";
      _style.maxWidth = SLOT_VIEW_WIDTH + "px";
      _style.height = SLOT_VIEW_HEIGHT;
    }

    if (isSelected) {
      _style.zIndex = 100000000000;
    }

    if (fullscreen) {
      _style.width = "100%";
      _style.height = "100vh";
      _style.left = 0;
      _style.top = 40;
      _style.zIndex = 1000000000000000;
      className = "fixed top-0 left-0";
    }

    return (
      <div
        ref={ref}
        onClick={onClick}
        onMouseDown={onMouseDown}
        style={_style}
        className={className}
      >
        {isSelected && (
          <>
            <div className="absolute top-0 right-0 w-1 h-1 bg-zinc-300 " />
            <div
              onClick={(e: any) => e.stopPropagation()}
              onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) =>
                startResizing(e, Orientation.XY)
              }
              style={
                allowSize
                  ? { width: 10, height: 10 }
                  : { maxWidth: 25, maxHeight: 25 }
              }
              className="absolute bottom-0 right-0 w-1 h-1 bg-zinc-300 cursor-se-resize z-30"
            />
            <div className="absolute top-0 left-0 w-1 h-1 bg-zinc-300 " />
            <div className="absolute bottom-0 left-0 w-1 h-1 bg-zinc-300 " />
            {((node as ObjectNode).name !== "divider" ||
              node.attributes["orientation"] === "vertical") &&
              (allowSize || isCustom) && (
                <div
                  onClick={(e: any) => e.stopPropagation()}
                  onMouseDown={(
                    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
                  ) => startResizing(e, Orientation.Y)}
                  className={
                    "absolute bottom-0 left-0 h-0.5 w-full cursor-ns-resize z-10 " +
                    (isCustom ? "" : "")
                  }
                />
              )}
            {((node as ObjectNode).name !== "divider" ||
              node.attributes["orientation"] === "horizontal") && (
              <div
                onClick={(e: any) => e.stopPropagation()}
                onMouseDown={(
                  e: React.MouseEvent<HTMLDivElement, MouseEvent>,
                ) => startResizing(e, Orientation.X)}
                className={
                  "absolute top-0 right-0 w-0.5 h-full  cursor-ew-resize z-10 " +
                  (isCustom ? "" : "")
                }
              />
            )}
          </>
        )}
        <IOletsComponent
          text={text}
          isOutlet={false}
          className="absolute flex -top-1"
          node={node}
          iolets={node.inlets}
        />
        <IOletsComponent
          text={text}
          isOutlet={true}
          className="absolute flex -bottom-1"
          node={node}
          iolets={node.outlets}
        />
        {children}
      </div>
    );
  }, [
    node,
    isError,
    size,
    children,
    style,
    text,
    nearestInlet,
    node.attributes.slotview,
    fullscreen,
  ]);
  return out;
};

export default PositionedComponent;
