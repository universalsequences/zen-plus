import React, { useEffect, useCallback, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";

const UMenu: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { sizeIndex } = usePosition();
  let { width, height } = objectNode.size || { width: 72, height: 18 };
  const { lockedMode } = useLocked();
  let [selectedOption, setSelectedOption] = useState(
    (objectNode.storedMessage as string) || "",
  );
  let options = Array.isArray(objectNode.attributes["options"])
    ? (objectNode.attributes["options"] as number[])
    : typeof objectNode.attributes["options"] === "number"
      ? [objectNode.attributes["options"]]
      : (objectNode.attributes["options"] as string).split(",");
  if (options.map((x) => parseFloat(x as string)).every((x) => !isNaN(x))) {
    options = options.map((x) => parseFloat(x as string));
  }

  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedOption(e.target.value);
      objectNode.receive(
        objectNode.inlets[0],
        isNaN(parseFloat(e.target.value))
          ? e.target.value
          : parseFloat(e.target.value),
      );
    },
    [setSelectedOption],
  );
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
        style={{ fontSize: height * 0.55, width, height }}
        className="text-white bg-zinc-900 outline-none pl-1 mr-1"
        placeholder="none"
        value={(selectedOption as string) || "none"}
        onChange={onChangeOption}
      >
        {options.map((x, i) => (
          <option key={i} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
};
export default UMenu;
