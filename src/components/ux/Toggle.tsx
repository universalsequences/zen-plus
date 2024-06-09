import React, { useCallback, useEffect, useState } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { Cross2Icon } from "@radix-ui/react-icons";
import { usePosition } from "@/contexts/PositionContext";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";

export const Toggle: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  usePosition();
  useValue();
  const [value, setValue] = useState(objectNode.custom?.value as number);
  const { lockedMode } = useLocked();

  console.log(
    "TOGGLE UX VALUE=%s custom.value=%s",
    value,
    objectNode.custom?.value,
    objectNode.custom,
  );
  const size = objectNode.size || { width: 80, height: 80 };

  useEffect(() => {
    setValue(objectNode.custom?.value as number);
  }, [objectNode.custom?.value]);

  const toggle = useCallback(() => {
    console.log("TOGGLING");
    if (!lockedMode) {
      return;
    }
    objectNode.receive(objectNode.inlets[0], "bang");
    setValue(objectNode.custom?.value as number);
  }, [objectNode.custom, lockedMode, objectNode]);

  return (
    <div
      onClick={toggle}
      style={{ width: size.width, height: size.height }}
      className={"cursor-pointer " + (value ? "bg-zinc-200" : "bg-zinc-800")}
    >
      <Cross2Icon className="w-full h-full" />
    </div>
  );
};
