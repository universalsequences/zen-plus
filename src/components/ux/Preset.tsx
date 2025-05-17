import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager, SlotToPreset } from "@/lib/nodes/definitions/core/preset";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useLocked } from "@/contexts/LockedContext";
import { PlusCircledIcon } from "@radix-ui/react-icons";

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
  const [editingPreset, setEditingPreset] = useState<number | null>(null);
  const [nameValue, setNameValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const showNames = objectNode.attributes.showNames as boolean;
  const slotMode = objectNode.attributes.slotMode as boolean;
  const numberOfSlots = objectNode.attributes.slots as number;

  const onMouseUp = useCallback((e: MouseEvent) => {
    isMouseDown.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Backspace" && !editingPreset) {
        objectNode.receive(objectNode.inlets[0], ["delete", ...selectedPresets]);
        setTimeout(() => {
          setSelectedPresets([]);
        }, 200);
      } else if (e.key === "Escape" && editingPreset !== null) {
        setEditingPreset(null);
      }
    },
    [editingPreset, selectedPresets],
  );

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPresets, editingPreset]);

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
  const numberOfPatterns = Array.isArray(value) ? (value[4] as number) : 0;

  useEffect(() => {
    if (Array.isArray(value)) {
      setCurrent(value[0] as number);
    }
  }, [value]);

  useEffect(() => {
    // Focus the input when editing is activated
    if (editingPreset !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingPreset]);

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
    setNameValue(e.target.value);
  }, []);

  const handleDoubleClick = useCallback(
    (index: number) => {
      if (showNames && lockedMode) {
        setEditingPreset(index);
        setNameValue(presetNames[index] || "");
      }
    },
    [showNames, lockedMode, presetNames],
  );

  const newPattern = useCallback(() => {
    objectNode.receive(objectNode.inlets[0], "new-pattern");
  }, [objectNode]);

  const switchToPattern = useCallback(
    (patternNumber: number) => {
      console.log("switch", patternNumber);
      objectNode.receive(objectNode.inlets[0], ["switch-to-pattern", patternNumber]);
    },
    [objectNode],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && editingPreset !== null) {
        e.preventDefault();
        // Save the name
        objectNode.receive(objectNode.inlets[0], ["set-name", nameValue, editingPreset]);

        // Show feedback animation
        const element = e.currentTarget.parentElement;
        if (element) {
          element.classList.add("bg-green-700", "transition-colors");
          setTimeout(() => {
            element.classList.remove("bg-green-700", "transition-colors");
          }, 300);
        }

        // Exit edit mode
        setEditingPreset(null);
      }
    },
    [editingPreset, nameValue, objectNode],
  );

  const currentPresetNumber = slotMode ? slotToPreset[current]?.[currentPattern] : current;

  return (
    <div
      style={{ width, height }}
      className={`${showNames ? "overflow-scroll p-1" : "flex flex-wrap overflow-hidden"} content-start bg-zinc-950`}
    >
      {slotMode && <div className="text-zinc-400 pl-1">slot: {current + 1}</div>}
      <div className="flex flex-wrap">
        {new Array(numberOfPatterns).fill(0).map((_x, i) => (
          <div
            key={i}
            onClick={() => switchToPattern(i)}
            className={`cursor-pointer ${i === currentPattern ? "border-white" : "border-zinc-500"} border w-5 h-5 rounded-lg flex m-0.5 text-white`}
          >
            <div className="m-auto">{i + 1}</div>
          </div>
        ))}
        <button className="cursor-pointer" onClick={() => newPattern()}>
          <PlusCircledIcon className="w-5 h-5 my-auto" color="white" />
        </button>
      </div>
      {mgmt.presets.map((_preset, i) => (
        <div
          key={i}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, i)}
          onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => onMouseOver(e, i)}
          onDoubleClick={() => handleDoubleClick(i)}
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
          {showNames &&
            (editingPreset === i ? (
              <input
                ref={inputRef}
                className="text-white bg-transparent outline-none w-full"
                onChange={onChangeName}
                onKeyPress={handleKeyPress}
                type="text"
                value={nameValue}
              />
            ) : (
              <span className="text-white text-xs truncate block">{presetNames[i] || ""}</span>
            ))}
        </div>
      ))}
    </div>
  );
};

export default PresetUI;
