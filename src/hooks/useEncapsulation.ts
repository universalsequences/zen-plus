import React, { useState, useCallback, useEffect, useRef } from "react";
import { getUpdatedSize } from "@/lib/utils";
import { usePosition, ResizingNode, DraggingNode, Coordinates } from "@/contexts/PositionContext";
import { usePatch } from "@/contexts/PatchContext";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import {
  MessageType,
  MessageNode,
  Node,
  IOlet,
  ObjectNode,
  AttributeValue,
} from "@/lib/nodes/types";
import { encapsulateNodes } from "@/utils/encapsulate";

interface Props {
  isCustomView?: boolean;
  zoomRef: React.MutableRefObject<number>;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
}
export const useNodeOperations = ({ isCustomView, zoomRef, scrollRef }: Props) => {
  const handleContextMenu = useCallback((event: any) => {
    if (isCustomView) {
      return;
    }
    event.preventDefault();
    let e = event;
    if (!scrollRef.current) {
      return;
    }
    let rect = scrollRef.current.getBoundingClientRect();
    let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
    let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;
    menuPositionRef.current = { x, y };
  }, []);

  const menuPositionRef = useRef({ x: 0, y: 0 });

  /*
    useEffect(() => {
        menuPositionRef.current = menuPosition;
    }, [menuPosition]);
    */

  let { updatePosition, size, setSize } = usePosition();

  const {
    deleteNodes,
    segmentCable,
    segmentCables,
    updateConnections,
    registerConnection,
    patch,
    objectNodes,
    messageNodes,
    newObjectNode,
    newMessageNode,
  } = usePatch();

  const createObjectNode = useCallback(
    (attributes?: { [x: string]: AttributeValue }) => {
      let objectNode = new ObjectNodeImpl(patch);
      if (attributes) {
        objectNode.attributes = {
          ...objectNode.attributes,
          ...attributes,
        };
      }
      newObjectNode(objectNode, { ...menuPositionRef.current });
      updatePosition(objectNode.id, { ...menuPositionRef.current });
      setSize(getUpdatedSize(objectNode, size));
      return objectNode;
    },
    [objectNodes, size, setSize],
  );

  const createNumberBox = useCallback(() => {
    let messageNode = new MessageNodeImpl(patch, MessageType.Number);
    newMessageNode(messageNode, { ...menuPositionRef.current });
    updatePosition(messageNode.id, { ...menuPositionRef.current });
  }, [messageNodes]);

  const createMessageNode = useCallback(() => {
    let messageNode = new MessageNodeImpl(patch, MessageType.Message);
    newMessageNode(messageNode, { ...menuPositionRef.current });
    updatePosition(messageNode.id, { ...menuPositionRef.current });
  }, [messageNodes]);

  const presentation = useCallback((nodes: Node[]) => {
    for (let node of nodes) {
      (node as ObjectNode).setAttribute("Include in Presentation", true);
      (node as ObjectNode).presentationPosition = {
        ...(node as ObjectNode).position,
      };
    }
  }, []);

  const encapsulate = useCallback(
    (nodesToEncapsulate: Node[]) => {
      encapsulateNodes(
        nodesToEncapsulate,
        patch,
        createObjectNode,
        registerConnection,
        deleteNodes,
      );
    },
    [patch, createObjectNode, registerConnection, deleteNodes],
  );

  return {
    encapsulate,
    handleContextMenu,
    createMessageNode,
    createObjectNode,
    createNumberBox,
    presentation,
  };
};
