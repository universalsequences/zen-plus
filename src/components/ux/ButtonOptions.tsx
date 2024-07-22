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
  const { width, height } = objectNode.size || { width: 72, height: 18 };
  const { lockedMode } = useLocked();
  const { attributesIndex } = useSelection();
  const [selectedOption, setSelectedOption] = useState(
    (objectNode.storedMessage as string) || "",
  );
  let options = Array.isArray(objectNode.attributes.options)
    ? (objectNode.attributes.options as number[])
    : typeof objectNode.attributes.options === "number"
      ? [objectNode.attributes.options]
      : (objectNode.attributes.options as string).split(",");

  if (
    options
      .map((x) => Number.parseFloat(x as string))
      .every((x) => !Number.isNaN(x))
  ) {
    options = options.map((x) => Number.parseFloat(x as string));
  }
  const { value: message } = useValue();

  useEffect(() => {
    if (message !== null) {
      setSelectedOption(message as string);
    }
  }, [message]);

  const onChangeValue = useCallback(
    (value: string) => {
      setSelectedOption(value);
      objectNode.receive(
        objectNode.inlets[0],
        Number.isNaN(Number.parseFloat(value))
          ? value
          : Number.parseFloat(value),
      );
    },
    [objectNode],
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
          key={opt}
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
