import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager, SlotToPreset } from "@/lib/nodes/definitions/core/preset";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode, Message } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { useLocked } from "@/contexts/LockedContext";
import {
  MinusCircledIcon,
  PlusCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsVerticalIcon,
} from "@radix-ui/react-icons";
import { DropdownMenu } from "@radix-ui/themes";

interface PresetBaseProps {
  objectNode: ObjectNode;
  presetManager: PresetManager;
  currentSlot: number;
  value: Message | null;
  targetNode?: ObjectNode; // Optional: use this node's attributes if provided
}

const PresetBase: React.FC<PresetBaseProps> = ({
  objectNode,
  presetManager,
  currentSlot,
  value,
  targetNode,
}) => {
  const { lockedMode } = useLocked();
  let ref = useRef<HTMLDivElement>(null);
  const { sizeIndex } = usePosition();
  let { width, height } = sizeIndex[objectNode.id] || { width: 100, height: 100 };
  const { setSelectedNodes } = useSelection();
  const isMouseDown = useRef(false);
  const [selectedPresets, setSelectedPresets] = useState<number[]>([]);
  const [editingPreset, setEditingPreset] = useState<number | null>(null);
  const [nameValue, setNameValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const presetRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Extract values from the value prop
  const presetNames = Array.isArray(value) ? (value[1] as string) : presetManager.presetNames;
  const slotToPreset = Array.isArray(value) ? (value[2] as SlotToPreset) : {};
  const currentPattern = Array.isArray(value) ? (value[3] as number) : 0;
  const numberOfPatterns = Array.isArray(value) ? (value[4] as number) : 0;

  useEffect(() => {
    if (Array.isArray(value)) {
      setCurrent(value[0] as number);
    }
  }, [value]);

  // Use target node's attributes if available, otherwise fall back to objectNode's attributes
  const attributeSource = targetNode || objectNode;
  // Use target node for message sending if available, otherwise use objectNode
  const messageTarget = targetNode || objectNode;

  const showNames = attributeSource.attributes.showNames as boolean;
  const slotMode = attributeSource.attributes.slotMode as boolean;
  const hidePatterns = attributeSource.attributes.hidePatterns as boolean;
  const patternMode = attributeSource.attributes.patternMode as boolean;
  const numberOfSlots = attributeSource.attributes.slots as number;
  const cellSize = attributeSource.attributes.cellSize as number;
  const compactPatternMode = attributeSource.attributes.compactPatternMode as boolean;

  // Calculate current preset number
  const currentPresetNumber = slotMode ? slotToPreset[currentSlot]?.[currentPattern] : current;

  // Scroll to current preset when it changes
  useEffect(() => {
    if (showNames && scrollContainerRef.current && presetRefs.current[currentPresetNumber]) {
      const container = scrollContainerRef.current;
      const presetElement = presetRefs.current[currentPresetNumber];

      if (presetElement) {
        const containerRect = container.getBoundingClientRect();
        const presetRect = presetElement.getBoundingClientRect();

        // Check if preset is not fully visible
        if (presetRect.top < containerRect.top || presetRect.bottom > containerRect.bottom) {
          presetElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
  }, [currentPresetNumber, showNames]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    isMouseDown.current = false;
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Backspace" && !editingPreset) {
        messageTarget.receive(messageTarget.inlets[0], ["delete", ...selectedPresets]);
        setTimeout(() => {
          setSelectedPresets([]);
        }, 200);
      } else if (e.key === "Escape" && editingPreset !== null) {
        setEditingPreset(null);
      }
    },
    [editingPreset, selectedPresets, messageTarget],
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

  useEffect(() => {
    // Focus the input when editing is activated
    if (editingPreset !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingPreset]);

  const switchToPreset = useCallback(
    (presetNumber: number, switchMode = false) => {
      if (slotMode && !switchMode) {
        messageTarget.receive(messageTarget.inlets[0], currentSlot);
        messageTarget.receive(messageTarget.inlets[0], ["copy-to-slot", presetNumber, currentSlot]);
      } else {
        messageTarget.receive(messageTarget.inlets[0], presetNumber);
      }
    },
    [presetManager, lockedMode, slotMode, messageTarget],
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
    messageTarget.receive(messageTarget.inlets[0], "new-pattern");
  }, [messageTarget]);

  const deletePattern = useCallback(() => {
    messageTarget.receive(messageTarget.inlets[0], "delete-pattern");
  }, [messageTarget]);

  const switchToPattern = useCallback(
    (patternNumber: number) => {
      messageTarget.receive(messageTarget.inlets[0], ["switch-to-pattern", patternNumber]);
    },
    [messageTarget],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && editingPreset !== null) {
        e.preventDefault();
        // Save the name
        messageTarget.receive(messageTarget.inlets[0], ["set-name", nameValue, editingPreset]);

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
    [editingPreset, nameValue, messageTarget],
  );

  const writeToMemory = useCallback(() => {
    messageTarget.receive(messageTarget.inlets[0], "write-to-memory");
  }, [messageTarget]);

  const saveAsNew = useCallback(() => {
    messageTarget.receive(messageTarget.inlets[0], "save-as-new");
  }, [messageTarget]);

  const goToPreviousPreset = useCallback(() => {
    const totalPresets = presetManager.presets.length;
    if (totalPresets === 0) return;

    const prevIndex = currentPresetNumber > 0 ? currentPresetNumber - 1 : totalPresets - 1;
    switchToPreset(prevIndex);
  }, [currentPresetNumber, presetManager.presets.length, switchToPreset]);

  const goToNextPreset = useCallback(() => {
    const totalPresets = presetManager.presets.length;
    if (totalPresets === 0) return;

    const nextIndex = currentPresetNumber < totalPresets - 1 ? currentPresetNumber + 1 : 0;
    switchToPreset(nextIndex);
  }, [currentPresetNumber, presetManager.presets.length, switchToPreset]);

  if (showNames) {
    return (
      <div className="w-full h-full flex flex-col bg-zinc-950">
        {/* Fixed header with current preset name and buttons */}
        <div className="flex-shrink-0 px-2 py-1 border-b border-zinc-800">
          {/* Current preset name with navigation and menu */}
          <div className="flex items-center justify-between mb-1">
            <button
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              onClick={goToPreviousPreset}
              disabled={presetManager.presets.length === 0}
            >
              <ChevronLeftIcon className="w-4 h-4 text-white" />
            </button>

            <div className="text-white font-medium truncate mx-2 flex-1 text-center">
              {presetNames[currentPresetNumber] || `Preset ${currentPresetNumber + 1}`}
            </div>

            <button
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              onClick={goToNextPreset}
              disabled={presetManager.presets.length === 0}
            >
              <ChevronRightIcon className="w-4 h-4 text-white" />
            </button>

            {/* Action menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button className="p-1 ml-1 hover:bg-zinc-800 rounded transition-colors">
                  <DotsVerticalIcon className="w-4 h-4 text-white" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                style={{ zIndex: 10000000000000000 }}
                color="indigo"
                className="bg-zinc-800 text-zinc-200 w-40 py-3 DropdownMenuContent text-sm"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={writeToMemory}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  Write to Memory
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={saveAsNew}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  Save as New
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>

        {/* Pattern controls - fixed if present */}
        {!hidePatterns && patternMode && (
          <div className="flex-shrink-0 px-2 py-1 border-b border-zinc-800">
            <div className="flex gap-2 w-full">
              <div className="flex flex-wrap flex-1">
                {new Array(numberOfPatterns).fill(0).map((_x, i) => (
                  <div
                    key={i}
                    style={{ width: cellSize, height: cellSize }}
                    onClick={() => switchToPattern(i)}
                    className={`items-center justify-center cursor-pointer ${i === currentPattern ? "border-white" : "border-zinc-500"} border flex m-0.5 text-white`}
                  >
                    <div style={{ fontSize: 8 }}>{i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  className="p-1 cursor-pointer bg-zinc-900 rounded hover:bg-zinc-800"
                  onClick={() => newPattern()}
                >
                  <PlusCircledIcon
                    style={{ width: cellSize * 0.6, height: cellSize * 0.6 }}
                    className="mx-auto"
                    color="white"
                  />
                </button>
                <button
                  className="p-1 cursor-pointer bg-zinc-900 rounded hover:bg-zinc-800"
                  onClick={() => deletePattern()}
                >
                  <MinusCircledIcon
                    style={{ width: cellSize * 0.6, height: cellSize * 0.6 }}
                    className="mx-auto"
                    color="white"
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable preset list */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1"
        >
          {!compactPatternMode &&
            presetManager.presets.map((_preset, i) => (
              <div
                key={i}
                ref={(el) => (presetRefs.current[i] = el)}
                onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, i)}
                onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => onMouseOver(e, i)}
                onDoubleClick={() => handleDoubleClick(i)}
                className={`w-full h-6 mb-1 px-2 flex items-center cursor-pointer border transition-colors ${
                  currentPresetNumber === i
                    ? "border-white"
                    : "border-transparent hover:border-zinc-600"
                }`}
              >
                {editingPreset === i ? (
                  <input
                    ref={inputRef}
                    className="text-white bg-transparent outline-none w-full"
                    onChange={onChangeName}
                    onKeyPress={handleKeyPress}
                    type="text"
                    value={nameValue}
                  />
                ) : (
                  <span className="text-white text-xs truncate block">
                    {presetNames[i] || `Preset ${i + 1}`}
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Original layout for non-showNames mode
  return (
    <div className="w-full h-full flex flex-wrap overflow-hidden content-start bg-zinc-950">
      {!compactPatternMode && slotMode && (
        <div className="text-zinc-400 pl-1">slot: {currentSlot + 1}</div>
      )}
      <div className="flex gap-2 w-full ">
        {!hidePatterns && patternMode && (
          <div className="flex flex-wrap flex-1">
            {new Array(numberOfPatterns).fill(0).map((_x, i) => (
              <div
                key={i}
                style={{ width: cellSize, height: cellSize }}
                onClick={() => switchToPattern(i)}
                className={`items-start cursor-pointer ${i === currentPattern ? "border-white" : "border-zinc-500"} border flex m-0.5 text-white`}
              >
                <div style={{ fontSize: 8 }} className="m-auto">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        {!hidePatterns && patternMode && (
          <div className="flex gap-2 flex-col w-12 p-1 border-l border-l-zinc-800 ">
            <button
              className="p-2 cursor-pointer bg-zinc-900 rounded-lg hover:bg-zinc-800"
              onClick={() => newPattern()}
            >
              <PlusCircledIcon
                style={{ width: cellSize, height: cellSize }}
                className="mx-auto active:stroke-zinc-100 my-auto"
                color="white"
              />
            </button>
            <button
              className="p-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 rounded-lg"
              onClick={() => deletePattern()}
            >
              <MinusCircledIcon
                style={{ width: cellSize, height: cellSize }}
                className="mx-auto active:stroke-zinc-100 my-auto"
                color="white"
              />
            </button>
          </div>
        )}
      </div>
      {!compactPatternMode &&
        presetManager.presets.map((_preset, i) => (
          <div
            key={i}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => onMouseDown(e, i)}
            onMouseOver={(e: React.MouseEvent<HTMLDivElement>) => onMouseOver(e, i)}
            onDoubleClick={() => handleDoubleClick(i)}
            className={
              "w-3 h-3 m-0.5 cursor-pointer border transition-colors " +
              (selectedPresets.includes(i)
                ? "bg-red-500"
                : currentPresetNumber === i
                  ? "bg-zinc-100 "
                  : presetManager.buffer?.[i] === 1
                    ? "bg-zinc-700 border-transparent "
                    : "bg-zinc-900 border-transparent ")
            }
          />
        ))}
    </div>
  );
};

export default PresetBase;
