import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { PositionProvider } from "@/contexts/PositionContext";
import { usePatch, PatchProvider } from "@/contexts/PatchContext";
import { ObjectNode, MessageNode } from "@/lib/nodes/types";
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
  if (subpatch) {
    return (
      <PatchProvider isCustomView={true} patch={subpatch}>
        <PositionProvider patch={subpatch}>
          <Inner />
        </PositionProvider>
      </PatchProvider>
    );
  }
  return <></>;
};

const Inner = () => {
  let { objectNodes, messageNodes } = usePatch();
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
    <div className="bg-zinc-900 flex w-full h-full">
      {visibleObjectNodes.map((node) => (
        <ObjectNodePresentationWrapper key={node.id} objectNode={node} />
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
