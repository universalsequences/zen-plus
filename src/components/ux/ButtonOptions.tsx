import React, { useEffect, useCallback, useState } from "react";
import { useValue } from "@/contexts/ValueContext";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";

const ButtonOptions: React.FC<{ objectNode: ObjectNode }> = ({
  objectNode,
}) => {
  const { sizeIndex } = usePosition();
  let { width, height } = objectNode.size || { width: 72, height: 18 };
  const { lockedMode } = useLocked();
  const { attributesIndex } = useSelection();
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
  let { value: message } = useValue();

  useEffect(() => {
    if (message !== null) {
      setSelectedOption(message as string);
    }
  }, [message, setSelectedOption]);

  const onChangeValue = useCallback(
    (value: string) => {
      setSelectedOption(value);
      objectNode.receive(
        objectNode.inlets[0],
        isNaN(parseFloat(value)) ? value : parseFloat(value),
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
      className={
        "text-white flex bg-zinc-900 p-1" +
        (lockedMode ? "" : " pointer-events-none")
      }
    >
      {options.map((opt) => (
        <div
          onClick={() => {
            if (lockedMode) {
              onChangeValue(opt as string);
            }
          }}
          className={
            (selectedOption === opt
              ? "border-zinc-100 bg-zinc-300 text-black"
              : "border-zinc-900 bg-zinc-900 text-white") +
            " mx-2 rounded-full px-2 py-1 cursor-pointer"
          }
        >
          {opt}
        </div>
      ))}
    </div>
  );
};
export default ButtonOptions;
