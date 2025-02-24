import React from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";

export const Panel: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  useSelection();
  useLocked();
  usePosition();

  let { width, height } = objectNode.size || { width: 100, height: 100 };
  return (
    <div
      style={{ backgroundColor: objectNode.attributes["backgroundColor"] as string, width, height }}
      className="  w-full h-full"
    ></div>
  );
};
