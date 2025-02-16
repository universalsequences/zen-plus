import React, { useEffect, useCallback, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { useValue } from "@/contexts/ValueContext";

const UMenu: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { sizeIndex } = usePosition();
  const { width, height } = objectNode.size || { width: 72, height: 18 };
  const { lockedMode } = useLocked();
  let [selectedOption, setSelectedOption] = useState((objectNode.storedMessage as string) || "");
  let { value: message } = useValue();
  useEffect(() => {
    if (message !== null) {
      setSelectedOption(message as string);
    }
  }, [message]);

  let options = Array.isArray(objectNode.attributes["options"])
    ? (objectNode.attributes["options"] as number[])
    : typeof objectNode.attributes["options"] === "number"
      ? [objectNode.attributes["options"]]
      : (objectNode.attributes["options"] as string).split(",");
  // if (options.map((x) => parseFloat(x as string)).every((x) => !isNaN(x))) {
  //   options = options.map((x) => parseFloat(x as string));
  //}

  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedOption(e.target.value);
      objectNode.receive(
        objectNode.inlets[0],
        //isNaN(parseFloat(e.target.value))
        e.target.value,
        //: parseFloat(e.target.value),
      );
    },
    [setSelectedOption],
  );
  const fontSize = height * 0.5;
  const arrowSize = fontSize * 0.5; // Arrow will be 50% of font size
  const className = "";

  return (
    <div
      onMouseDown={(e: any) => {
        if (lockedMode) {
          e.stopPropagation();
        }
      }}
      className={"bg-zinc-900 " + (lockedMode ? "" : " pointer-events-none")}
    >
      <select
        style={{
          fontSize,
          width,
          height,
          paddingRight: arrowSize * 2.5, // Make room for arrow
        }}
        className={`text-white bg-zinc-900 outline-none pl-1 appearance-none ${className}`}
        value={selectedOption || "none"}
        onChange={onChangeOption}
      >
        {options.map((x, i) => (
          <option key={i} value={x}>
            {x}
          </option>
        ))}
      </select>
      <div
        className="absolute pointer-events-none"
        style={{
          right: arrowSize * 0.8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderLeft: `${arrowSize * 0.6}px solid transparent`,
          borderRight: `${arrowSize * 0.6}px solid transparent`,
          borderTop: `${arrowSize}px solid white`,
        }}
      />
    </div>
  );
};
export default UMenu;
