import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";
import { useSelection } from "@/contexts/SelectionContext";

const PresetUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
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
        for (const index of selectedPresets) {
          mgmt.presets[index] = {};
        }
        setSelectedPresets([]);
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
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (e.metaKey) {
      isMouseDown.current = true;
      setSelectedPresets((prev) => [...prev, index]);
    } else {
      switchToPreset(index);
    }
  }, []);

  const onMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>, i: number) => {
    if (isMouseDown.current) {
      setSelectedPresets((prev) => [...prev, i]);
      setSelectedNodes([]);
    }
  }, []);

  useValue();

  useEffect(() => {
    setCurrent(mgmt.currentPreset);
  }, [mgmt.currentPreset]);

  const switchToPreset = useCallback(
    (i: number) => {
      mgmt.switchToPreset(i);
      setCurrent(i);
    },
    [setCurrent, mgmt],
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
              : current === i
                ? "bg-zinc-100 "
                : Object.keys(mgmt.presets[i]).length === 0
                  ? "bg-zinc-900"
                  : "bg-zinc-400")
          }
        ></div>
      ))}
    </div>
  );
};

export default PresetUI;
