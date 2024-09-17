import React from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";

const Divider: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let { attributesIndex } = useSelection();
  let { lockedMode } = useLocked();
  const { sizeIndex } = usePosition();

  let { width, height } = objectNode.size || { width: 100, height: 100 };
  let size = objectNode.size || { width: 100, height: 100 };
  if (objectNode.attributes["orientation"] === "vertical") {
    return <div style={{ width: 1 }} className="bg-zinc-500  h-full"></div>;
  } else {
    return <div style={{ height: 1, width: size.width }} className="bg-zinc-500 w-full"></div>;
  }
};

export default Divider;
