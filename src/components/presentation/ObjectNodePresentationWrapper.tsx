import { usePositionStyle } from "@/hooks/usePositionStyle";
import { ObjectNode } from "@/lib/nodes/types";
import { index, type NodeProps } from "../ux/index";
import React from "react";
import CustomSubPatchView from "../CustomSubPatchView";
import { ValueProvider } from "@/contexts/ValueContext";
import SlotView from "../SlotView";

export const ObjectNodePresentationWrapper: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  const style = usePositionStyle(objectNode, true);
  const _style = React.useMemo(() => {
    const _s = { ...style };

    if (objectNode.size) {
      if (!objectNode.attributes["slotview"]) {
        _s.width = objectNode.size.width;
        _s.height = objectNode.size.height;
      } else {
        _s.width = 178;
        _s.height = 18;
      }
    }
    return _s;
  }, [style]);

  let CustomComponent = (objectNode.name
    ? index[objectNode.name]
    : undefined) as unknown as React.ComponentType<NodeProps>;
  let isCustomSubPatchView = objectNode.attributes["Custom Presentation"];

  const moduleType = objectNode.attributes["moduleType"];
  const aux = moduleType ? `slot-view bg-zinc-800 ${moduleType}` : "";
  return (
    <ValueProvider node={objectNode}>
      <div style={_style} className={`node-component absolute flex ${aux}`}>
        {isCustomSubPatchView ? (
          objectNode.attributes["slotview"] ? (
            <SlotView objectNode={objectNode} />
          ) : (
            <CustomSubPatchView objectNode={objectNode} />
          )
        ) : CustomComponent ? (
          <CustomComponent objectNode={objectNode} />
        ) : (
          <></>
        )}
      </div>
    </ValueProvider>
  );
};
