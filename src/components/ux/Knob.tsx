import React, { useState, useEffect, useRef } from "react";
import { useValue } from "@/contexts/ValueContext";
import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { useMouseEditValue } from "@/hooks/useMouseEditValue";

const Knob: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let ref = useRef<HTMLDivElement | null>(null);
  let { lockedMode } = useLocked();
  let [value, setValue] = useState(
    objectNode.arguments[0] !== undefined ? (objectNode.arguments[0] as number) : 0.5,
  );
  let [editing, setEditing] = useState(false);

  let { value: message } = useValue();
  let { attributesIndex } = useSelection();
  let attributes = objectNode.attributes;
  let { strokeColor } = attributes;
  const { onMouseDown } = useMouseEditValue(ref, value, setValue, 0, 1);

  useEffect(() => {
    if (message !== null) {
      setValue(message as number);
    }
  }, [message, setValue]);

  const handleMouseDown = (e: any) => {
    if (lockedMode) {
      e.stopPropagation();
      onMouseDown(e);
    }
  };

  useEffect(() => {
    objectNode.text = "knob " + value;
    objectNode.arguments[0] = value;
    objectNode.send(objectNode.outlets[0], value);
  }, [value]);

  const { sizeIndex } = usePosition();
  let size = sizeIndex[objectNode.id] || { width: 100, height: 100 };

  let angle = 20 + value * 360; // Convert value to angle

  angle = (360 * angle) / 400;

  const radius = 40;
  const centerX = 50;
  const centerY = 50;

  // Start angle is always 195 degrees (6:30)
  const startAngle = 195;
  const endAngle = angle + 185;

  const getPath = (startAngle: number, endAngle: number): string => {
    // Convert angles to radians
    const startRadians = (Math.PI / 180) * (startAngle - 90);
    const endRadians = (Math.PI / 180) * (endAngle - 90);

    // Calculate start and end points
    const startX = centerX + radius * Math.cos(startRadians);
    const startY = centerY + radius * Math.sin(startRadians);
    const endX = centerX + radius * Math.cos(endRadians);
    const endY = centerY + radius * Math.sin(endRadians);

    // Determine if the arc should be the large arc or not
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    // Create the path data for the arc
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // SVG arc path calculation
  return (
    <div
      ref={ref}
      style={{ width: size.width, height: size.height }}
      className="w-full relative flex knob-container"
      onMouseDown={handleMouseDown}
    >
      <svg
        viewBox="0 0 100 100"
        width={size.width}
        height={size.height}
        onMouseDown={handleMouseDown}
        style={{ cursor: "pointer" }}
      >
        <path d={getPath(startAngle, 360 + 170)} stroke="#383838" strokeWidth="5" fill="none" />
        <path
          d={getPath(startAngle, endAngle)}
          stroke={strokeColor as string}
          strokeWidth="5"
          fill="none"
        />
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="90"
          stroke="#383838"
          strokeWidth="5"
          transform={`rotate(${angle}, 50, 50)`}
        />
      </svg>
    </div>
  );
};

export default Knob;
