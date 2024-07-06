import React, { useEffect, useCallback, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";
import { ObjectNode } from "@/lib/nodes/types";
import { SketchPicker } from "react-color";
import { useSelection } from "@/contexts/SelectionContext";

const Color: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let [opened, setOpened] = useState(false);
  let { lockedMode } = useLocked();

  const { selectedNodes, setSelectedNodes } = useSelection();

  const onChange = useCallback((hex: string) => {
    objectNode.receive(objectNode.inlets[0], hex);
  }, []);

  useEffect(() => {
    if (selectedNodes.includes(objectNode)) {
    } else if (selectedNodes.some((x) => (x as ObjectNode).name === "color")) {
      setOpened(false);
    }
  }, [selectedNodes, objectNode]);

  let { value } = useValue();

  if (!value && objectNode.custom) {
    value = (objectNode.custom as any).value as string;
  }

  return (
    <div
      onMouseDown={(e: any) => {
        if (lockedMode) {
          e.stopPropagation();
        }
        setSelectedNodes([objectNode]);
      }}
      onClick={(e: any) => {
        if (lockedMode) {
          e.stopPropagation();
        }
      }}
    >
      <div
        onClick={() => {
          if (lockedMode) {
            setOpened(!opened);
          }
        }}
        style={{ backgroundColor: (value as string) || "#000000" }}
        className="w-8 h-8 cursor-pointer"
      />
      {opened && (
        <div className="absolute top-6 -left-40">
          <SketchPicker
            color={(value as string) || "#000000"}
            onChange={(c: any) => onChange(c.hex)}
          />{" "}
        </div>
      )}
    </div>
  );
};

export default Color;
