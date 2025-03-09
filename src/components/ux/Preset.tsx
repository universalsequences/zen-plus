import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useLocked } from "@/contexts/LockedContext";

const PresetUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { lockedMode } = useLocked();
  let ref = useRef<HTMLDivElement>(null);
  const { sizeIndex } = usePosition();
  let { width, height } = sizeIndex[objectNode.id] || { width: 100, height: 100 };
  let mgmt = objectNode.custom as any as PresetManager;
  const { setSelectedNodes } = useSelection();
  let [current, setCurrent] = useState(mgmt.currentPreset);
  const isMouseDown = useRef(false);
  const [selectedPresets, setSelectedPresets] = useState<number[]>([]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    isMouseDown.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        objectNode.receive(objectNode.inlets[0], ["delete", ...selectedPresets]);
        setTimeout(() => {
          setSelectedPresets([]);
        }, 200);
      }
    },
    [mgmt, selectedPresets],
  );

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPresets]);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, index: number) => {
      if (!lockedMode) return;
      if (e.metaKey) {
        isMouseDown.current = true;
        setSelectedPresets((prev) => [...prev, index]);
      } else {
        switchToPreset(index);
      }
    },
    [lockedMode],
  );

  const onMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>, i: number) => {
    if (isMouseDown.current) {
      setSelectedPresets((prev) => [...prev, i]);
      setSelectedNodes([]);
    }
  }, []);

  const { value } = useValue();

  useEffect(() => {
    if (value !== undefined) {
      setCurrent(value as number);
    }
  }, [value]);

  const switchToPreset = useCallback(
    (presetNumber: number) => {
      objectNode.receive(objectNode.inlets[0], presetNumber);
      setCurrent(presetNumber);
    },
    [setCurrent, mgmt, lockedMode],
  );

  return (
    <div
      style={{ width, height }}
      className="flex flex-wrap overflow-hidden content-start bg-zinc-950"
    >
      {mgmt.presets.map((_preset, i) => (
        <div
          key={i}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, i)}
          onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => onMouseOver(e, i)}
          className={
            "w-3 h-3 m-0.5 cursor-pointer transition-colors " +
            (selectedPresets.includes(i)
              ? "bg-red-500"
              : mgmt.buffer?.[i] === 2
                ? "bg-zinc-100 "
                : mgmt.buffer?.[i]
                  ? "bg-zinc-700"
                  : "bg-zinc-900")
          }
        ></div>
      ))}
    </div>
  );
};

export default PresetUI;
