import React, { useEffect, useCallback, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { useValue } from "@/contexts/ValueContext";

const UMenu: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { sizeIndex } = usePosition();
  const { width, height } = objectNode.size || { width: 72, height: 18 };
  const { lockedMode } = useLocked();
  let [selectedOption, setSelectedOption] = useState<string>(
    (objectNode.custom?.value as string) || "",
  );
  let { value: message } = useValue();
  const isNarrow = width < 24;

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

  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedOption(e.target.value);
      objectNode.receive(objectNode.inlets[0], e.target.value);
    },
    [setSelectedOption],
  );

  const fontSize =
    height * (isNarrow && options.some((x) => x.toString().length > 2) ? 0.37 : 0.54);
  const arrowSize = fontSize * 0.5;

  // Function to format option text for display
  const formatOptionText = (text: string | number) => {
    const textStr = text.toString();
    if (isNarrow && textStr.includes("/")) {
      const [numerator, denominator] = textStr.split("/");
      return `${numerator}/\n${denominator}`;
    }
    return textStr;
  };

  return (
    <div
      onMouseDown={(e: React.MouseEvent) => {
        if (lockedMode) {
          e.stopPropagation();
        }
      }}
      className={"bg-zinc-900 relative " + (lockedMode ? "" : " pointer-events-none")}
    >
      <select
        style={{
          fontSize,
          width,
          height,
          paddingRight: arrowSize * 2.5,
          whiteSpace: isNarrow ? "normal" : "nowrap",
          wordWrap: isNarrow ? "break-word" : "normal",
          lineHeight: isNarrow ? "1" : "normal",
          textAlign: isNarrow ? "center" : "left",
        }}
        className="text-white bg-zinc-900 outline-none  appearance-none"
        value={selectedOption || "none"}
        onChange={onChangeOption}
      >
        {options.map((x, i) => (
          <option
            key={i}
            value={x}
            style={{
              whiteSpace: isNarrow ? "normal" : "nowrap",
              minHeight: isNarrow ? fontSize * 2.2 : "auto",
              padding: isNarrow
                ? `${fontSize * 0.1}px ${fontSize * 0.2}px`
                : `${fontSize * 0.25}px ${fontSize * 0.5}px`,
              textAlign: isNarrow ? "center" : "left",
            }}
          >
            {formatOptionText(x)}
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
