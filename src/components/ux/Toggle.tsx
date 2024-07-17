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
        color: value
          ? strokeColor
          : interpolateHexColors(fillColor, strokeColor, 0.35),
        backgroundColor: fillColor,
        width: size.width,
        height: size.height,
      }}
      className={`flex cursor-pointer border border-zinc-${value ? 700 : 900} text-xs`}
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

function interpolateHexColors(
  color1: string,
  color2: string,
  ratio: number,
): string {
  // Ensure the ratio is within the correct range
  ratio = Math.max(0, Math.min(1, ratio));

  // Convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    hex = hex.replace("#", "");
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  // Convert RGB to hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    const componentToHex = (c: number): string => {
      const hex = c.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Interpolate each color component
  const r = Math.round(rgb1.r + ratio * (rgb2.r - rgb1.r));
  const g = Math.round(rgb1.g + ratio * (rgb2.g - rgb1.g));
  const b = Math.round(rgb1.b + ratio * (rgb2.b - rgb1.b));

  return rgbToHex(r, g, b);
}
