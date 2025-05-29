import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { PositionProvider, usePosition } from "@/contexts/PositionContext";
import { usePatch, PatchProvider } from "@/contexts/PatchContext";
import type { Size, ObjectNode, MessageNode } from "@/lib/nodes/types";
import PatchComponent from "@/components/PatchComponent";
import ObjectNodeWrapper from "./ObjectNodeWrapper";
import MessageNodeWrapper from "./MessageNodeWrapper";
import { ObjectNodePresentationWrapper } from "./presentation/ObjectNodePresentationWrapper";

const CustomSubPatchView: React.FC<{
  objectNodes?: ObjectNode[];
  messageNodes?: MessageNode[];
  objectNode: ObjectNode;
}> = ({ objectNode, objectNodes, messageNodes }) => {
  let subpatch = objectNode.subpatch;
  const { updateSize } = usePosition();
  if (subpatch) {
    return (
      <PatchProvider isCustomView={true} patch={subpatch}>
        <PositionProvider patch={subpatch}>
          <Inner updateSize={updateSize} objectNode={objectNode} />
        </PositionProvider>
      </PatchProvider>
    );
  }
  return <></>;
};

const Inner = ({
  updateSize,
  objectNode,
}: { updateSize: (id: string, size: Size) => void; objectNode: ObjectNode }) => {
  let { objectNodes, messageNodes } = usePatch();
  const { sizeIndex } = usePosition();
  const visibleObjectNodes = useMemo(() => {
    let onodes = [];
    if (objectNodes) {
      for (let node of objectNodes) {
        if (node.attributes["Include in Presentation"]) {
          onodes.push(node);
        }
      }
    }
    return onodes;
  }, [objectNodes]);

  /*
  const lastUpdate = useRef(0);
  useEffect(() => {
    if (new Date().getTime() - lastUpdate.current < 100) {
      return;
    }
    lastUpdate.current = new Date().getTime();
    if (!objectNode.attributes.dynamicSizing) return;
    let maxX = objectNode.size?.width || 100;
    let maxY = -1;
    for (const node of objectNodes) {
      const p = node.presentationPosition;
      const size = node.size;
      if (p && size) {
        const y = size.height;
        if (y > maxY) {
          maxY = y;
        }
      }
    }
    if (maxY > 10) {
      objectNode.size = { width: maxX, height: maxY };
      updateSize(objectNode.id, { width: maxX, height: maxY });
    }
  }, [sizeIndex, objectNodes]);
  */

  const visibleMessageNodes = useMemo(() => {
    let nodes = [];
    if (messageNodes) {
      for (let node of messageNodes) {
        if (node.attributes["Include in Presentation"]) {
          nodes.push(node);
        }
      }
    }
    return nodes;
  }, [messageNodes]);

  return (
    <div
      className={`custom-subpatch-wrapper ${objectNode.attributes.ui as string} bg-zinc-900 flex w-full h-full`}
    >
      {visibleObjectNodes.map((node) => (
        <ObjectNodePresentationWrapper key={node.id} objectNode={node} size={sizeIndex[node.id]} />
      ))}
      {visibleMessageNodes.map((node) => (
        <MessageNodeWrapper isCustomView={true} key={node.id} messageNode={node} />
      ))}
    </div>
  );
};
export default CustomSubPatchView;

/*
  return (
    <PatchComponent
      tileRef={ref}
      fileToOpen={null}
      setFileToOpen={(x: any) => 0}
      maxWidth={100}
      maxHeight={100}
      visibleObjectNodes={visibleObjectNodes}
      isCustomView={true}
      index={0}
    />
  )
      */
