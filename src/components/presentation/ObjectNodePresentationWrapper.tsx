import { usePositionStyle } from "@/hooks/usePositionStyle";
import { ObjectNode } from "@/lib/nodes/types";
import { index, type NodeProps } from "../ux/index";
import React from "react";
import CustomSubPatchView from "../CustomSubPatchView";
import { ValueProvider } from "@/contexts/ValueContext";

export const ObjectNodePresentationWrapper: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  const style = usePositionStyle(objectNode, true);

  let CustomComponent = (objectNode.name
    ? index[objectNode.name]
    : undefined) as unknown as React.ComponentType<NodeProps>;
  let isCustomSubPatchView = objectNode.attributes["Custom Presentation"];

  return (
    <ValueProvider node={objectNode}>
      <div style={style} className="absolute">
        {isCustomSubPatchView ? (
          <CustomSubPatchView objectNode={objectNode} />
        ) : CustomComponent ? (
          <CustomComponent objectNode={objectNode} />
        ) : (
          <></>
        )}
      </div>
    </ValueProvider>
  );
};
