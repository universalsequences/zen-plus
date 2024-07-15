import React, { useCallback, useEffect, useState } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { Cross2Icon, PauseIcon, PlayIcon } from "@radix-ui/react-icons";
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

  const size = objectNode.size || { width: 80, height: 80 };

  useEffect(() => {
    setValue(objectNode.custom?.value as number);
  }, [objectNode.custom?.value]);

  const toggle = useCallback(() => {
    if (!lockedMode) {
      return;
    }
    objectNode.receive(objectNode.inlets[0], "bang");
    setValue(objectNode.custom?.value as number);
  }, [objectNode.custom, lockedMode, objectNode]);

  const isPlayIcon = objectNode.attributes.playIcon;
  const { text, fillColor, strokeColor } = objectNode.attributes;
  return (
    <div
      onClick={toggle}
      style={{
        color: value ? strokeColor : fillColor,
        backgroundColor: value ? fillColor : strokeColor,
        width: size.width,
        height: size.height,
      }}
      className={`flex cursor-pointer border border-zinc-${value ? 700 : 400} text-xs`}
    >
      {text !== "" ? (
        <span className="m-auto text-xs">{text}</span>
      ) : isPlayIcon ? (
        !value ? (
          <PlayIcon className="w-full h-full" color={strokeColor as string} />
        ) : (
          <PauseIcon className="w-full h-full" />
        )
      ) : (
        <Cross2Icon className="w-full h-full" />
      )}
    </div>
  );
};
