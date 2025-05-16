import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager, SlotToPreset } from "@/lib/nodes/definitions/core/preset";
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

  const showNames = objectNode.attributes.showNames as boolean;
  const slotMode = objectNode.attributes.slotMode as boolean;
  const numberOfSlots = objectNode.attributes.slots as number;

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

  const presetNames = Array.isArray(value) ? (value[1] as string) : mgmt.presetNames;
  const slotToPreset = Array.isArray(value) ? (value[2] as SlotToPreset) : {};
  const currentPattern = Array.isArray(value) ? (value[3] as number) : 0;

  console.log("value received=", value);

  useEffect(() => {
    if (Array.isArray(value)) {
      setCurrent(value[0] as number);
    }
  }, [value]);

  const switchToPreset = useCallback(
    (presetNumber: number, switchMode = false) => {
      if (slotMode && !switchMode) {
        objectNode.receive(objectNode.inlets[0], ["copy-to-slot", presetNumber]);
      } else {
        objectNode.receive(objectNode.inlets[0], presetNumber);
      }
    },
    [setCurrent, mgmt, lockedMode, slotMode],
  );

  const onChangeName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    objectNode.receive(objectNode.inlets[0], ["set-name", value]);
  }, []);

  const currentPresetNumber = slotMode ? slotToPreset[current]?.[currentPattern] : current;
  console.log("current preset number=", currentPresetNumber);

  return (
    <div
      style={{ width, height }}
      className={`${showNames ? "overflow-scroll p-1" : "flex flex-wrap overflow-hidden"} content-start bg-zinc-950`}
    >
      {slotMode && (
        <div className="flex flex-wrap">
          {new Array(numberOfSlots).fill(1).map((x, i) => (
            <div
              onClick={() => switchToPreset(i, true)}
              className={`flex text-white text-xs text-center w-6 h-6 border ${i === current ? "border-white" : "border-zinc-600"} rounded-full m-0.5 cursor-pointer`}
            >
              <div className="m-auto">{i + 1}</div>
            </div>
          ))}
        </div>
      )}
      {mgmt.presets.map((_preset, i) => (
        <div
          key={i}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, i)}
          onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => onMouseOver(e, i)}
          className={
            (showNames ? "w-full h-4" : "w-3 h-3") +
            " m-0.5 cursor-pointer border transition-colors " +
            (selectedPresets.includes(i)
              ? "bg-red-500"
              : currentPresetNumber === i
                ? showNames
                  ? "border-white"
                  : "bg-zinc-100 "
                : !showNames && mgmt.buffer?.[i] === 1
                  ? "bg-zinc-700 border-transparent "
                  : "bg-zinc-900 border-transparent ")
          }
        >
          {showNames ? (
            <input
              className="text-white bg-transparent outline-none"
              onChange={onChangeName}
              type="text"
              value={presetNames[i]}
            />
          ) : (
            ""
          )}
        </div>
      ))}
    </div>
  );
};

export default PresetUI;
