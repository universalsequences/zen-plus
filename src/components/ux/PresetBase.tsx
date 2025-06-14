import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset/manager";
import { SlotToPreset } from "@/lib/nodes/definitions/core/preset/types";
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

const PresetBase: React.FC<PresetBaseProps> = memo(
  ({ objectNode, presetManager, currentSlot, value, targetNode }) => {
    const { lockedMode } = useLocked();
    let ref = useRef<HTMLDivElement>(null);
    const { sizeIndex } = usePosition();

    // Memoize size extraction to prevent re-renders when other nodes' sizes change
    const nodeSize = useMemo(
      () => sizeIndex[objectNode.id] || { width: 100, height: 100 },
      [sizeIndex, objectNode.id],
    );
    let { width, height } = nodeSize;
    const { setSelectedNodes } = useSelection();
    const isMouseDown = useRef(false);
    const [selectedPresets, setSelectedPresets] = useState<number[]>([]);
    const [editingPreset, setEditingPreset] = useState<number | null>(null);
    const [nameValue, setNameValue] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [current, setCurrent] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const presetRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Drag and drop state for pattern reordering
    const [draggingPattern, setDraggingPattern] = useState<number | null>(null);
    const [dragOverPattern, setDragOverPattern] = useState<number | null>(null);
    const [optimisticPatternOrder, setOptimisticPatternOrder] = useState<number[]>([]);

    // Memoize extraction of values from the value prop
    const extractedValues = useMemo(() => {
      if (Array.isArray(value)) {
        return {
          presetNames: value[1] as string,
          slotToPreset: value[2] as SlotToPreset,
          currentPattern: value[3] as number,
          numberOfPatterns: value[4] as number,
        };
      }
      return {
        presetNames: presetManager.presetNames || [],
        slotToPreset: {} as SlotToPreset,
        currentPattern: 0,
        numberOfPatterns: 0,
      };
    }, [value, presetManager.presetNames]);

    const { presetNames, slotToPreset, currentPattern, numberOfPatterns } = extractedValues;

    useEffect(() => {
      if (Array.isArray(value)) {
        setCurrent(value[0] as number);
      }
    }, [value]);

    // Reset optimistic state when numberOfPatterns changes
    useEffect(() => {
      setOptimisticPatternOrder([]);
      setDraggingPattern(null);
      setDragOverPattern(null);
    }, [numberOfPatterns]);

    // Reset drag state when locked mode changes
    useEffect(() => {
      if (!lockedMode) {
        setDraggingPattern(null);
        setDragOverPattern(null);
      }
    }, [lockedMode]);

    // Memoize attribute source and message target
    const attributeSource = useMemo(() => targetNode || objectNode, [targetNode, objectNode]);
    const messageTarget = useMemo(() => targetNode || objectNode, [targetNode, objectNode]);

    // Memoize extracted attributes to prevent re-computation
    const attributes = useMemo(
      () => ({
        showNames: attributeSource.attributes.showNames as boolean,
        slotMode: attributeSource.attributes.slotMode as boolean,
        hidePatterns: attributeSource.attributes.hidePatterns as boolean,
        patternMode: attributeSource.attributes.patternMode as boolean,
        numberOfSlots: attributeSource.attributes.slots as number,
        cellSize: attributeSource.attributes.cellSize as number,
        compactPatternMode: attributeSource.attributes.compactPatternMode as boolean,
      }),
      [attributeSource.attributes],
    );

    const {
      showNames,
      slotMode,
      hidePatterns,
      patternMode,
      numberOfSlots,
      cellSize,
      compactPatternMode,
    } = attributes;

    // Memoize current preset number calculation
    const currentPresetNumber = useMemo(
      () => (slotMode ? slotToPreset[currentSlot as number]?.[currentPattern as number] : current),
      [slotMode, slotToPreset, currentSlot, currentPattern, current],
    );

    // Memoize pattern display order (optimistic or real)
    const patternDisplayOrder = useMemo(
      () =>
        optimisticPatternOrder.length > 0
          ? optimisticPatternOrder
          : Array.from({ length: numberOfPatterns }, (_, i) => i),
      [optimisticPatternOrder, numberOfPatterns],
    );

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

    const switchToPreset = useCallback(
      (presetNumber: number, switchMode = false) => {
        if (slotMode && !switchMode) {
          messageTarget.receive(messageTarget.inlets[0], currentSlot);
          messageTarget.receive(messageTarget.inlets[0], [
            "copy-to-slot",
            presetNumber,
            currentSlot,
          ]);
        } else {
          messageTarget.receive(messageTarget.inlets[0], presetNumber);
        }
      },
      [slotMode, messageTarget, currentSlot],
    );

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
      [lockedMode, switchToPreset],
    );

    const onMouseOver = useCallback(
      (e: React.MouseEvent<HTMLDivElement>, i: number) => {
        if (isMouseDown.current) {
          setSelectedPresets((prev) => [...prev, i]);
          setSelectedNodes([]);
        }
      },
      [setSelectedNodes],
    );

    useEffect(() => {
      // Focus the input when editing is activated
      if (editingPreset !== null && inputRef.current) {
        inputRef.current.focus();
      }
    }, [editingPreset]);

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

    const movePatternTo = useCallback(
      (sourcePattern: number, targetPosition: number) => {
        messageTarget.receive(messageTarget.inlets[0], [
          "move-pattern-to",
          sourcePattern,
          targetPosition,
        ]);
      },
      [messageTarget],
    );

    // Pattern drag handlers
    const handlePatternDragStart = useCallback(
      (e: React.DragEvent<HTMLDivElement>, patternIndex: number) => {
        e.dataTransfer.effectAllowed = "move";
        setDraggingPattern(patternIndex);
      },
      [],
    );

    const handlePatternDragOver = useCallback(
      (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverPattern(targetIndex);
      },
      [],
    );

    const handlePatternDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      // Only clear if we're leaving the entire pattern container
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOverPattern(null);
      }
    }, []);

    const handlePatternDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();

        if (
          draggingPattern !== null &&
          draggingPattern !== targetIndex &&
          targetIndex >= 0 &&
          targetIndex < numberOfPatterns
        ) {
          try {
            // Calculate the actual pattern indices from the current display order
            const currentOrder =
              optimisticPatternOrder.length > 0
                ? optimisticPatternOrder
                : Array.from({ length: numberOfPatterns }, (_, i) => i);

            const sourcePattern = draggingPattern;
            const sourceDisplayIndex = currentOrder.indexOf(sourcePattern);

            if (sourceDisplayIndex !== -1) {
              // Create new order for optimistic update
              const newOrder = [...currentOrder];
              const [removed] = newOrder.splice(sourceDisplayIndex, 1);
              newOrder.splice(targetIndex, 0, removed);
              setOptimisticPatternOrder(newOrder);

              // Send the command to the audio thread using original pattern indices
              movePatternTo(sourcePattern, targetIndex);

              // Clear optimistic state after a delay to allow the real state to update
              setTimeout(() => {
                setOptimisticPatternOrder([]);
              }, 500);
            }
          } catch (error) {
            console.error("Error during pattern reordering:", error);
            // Reset optimistic state on error
            setOptimisticPatternOrder([]);
          }
        }

        setDraggingPattern(null);
        setDragOverPattern(null);
      },
      [draggingPattern, numberOfPatterns, movePatternTo, optimisticPatternOrder],
    );

    const handlePatternDragEnd = useCallback(() => {
      setDraggingPattern(null);
      setDragOverPattern(null);
    }, []);

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

    // Memoize total presets to reduce recalculation
    const totalPresets = useMemo(
      () => presetManager.presets.length,
      [presetManager.presets.length],
    );

    const goToPreviousPreset = useCallback(() => {
      if (totalPresets === 0) return;
      const prevIndex = currentPresetNumber > 0 ? currentPresetNumber - 1 : totalPresets - 1;
      switchToPreset(prevIndex);
    }, [currentPresetNumber, totalPresets, switchToPreset]);

    const goToNextPreset = useCallback(() => {
      if (totalPresets === 0) return;
      const nextIndex = currentPresetNumber < totalPresets - 1 ? currentPresetNumber + 1 : 0;
      switchToPreset(nextIndex);
    }, [currentPresetNumber, totalPresets, switchToPreset]);

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
                {presetNames?.[currentPresetNumber] || `Preset ${currentPresetNumber + 1}`}
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
                  {patternDisplayOrder.map((patternIndex, displayIndex) => {
                    const isCurrentPattern = patternIndex === currentPattern;
                    const isDragging = draggingPattern === patternIndex;
                    const isDragTarget = dragOverPattern === displayIndex;

                    return (
                      <div
                        key={patternIndex}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          opacity: isDragging ? 0.5 : 1,
                          transform: isDragging ? "rotate(5deg) scale(1.05)" : "none",
                          borderColor: isDragTarget
                            ? "#3b82f6"
                            : isCurrentPattern
                              ? "#fff"
                              : "#6b7280",
                          borderWidth: isDragTarget ? "2px" : "1px",
                          boxShadow: isDragging ? "0 4px 8px rgba(0,0,0,0.3)" : "none",
                        }}
                        onClick={() => switchToPattern(patternIndex)}
                        onDragStart={(e) => handlePatternDragStart(e, patternIndex)}
                        onDragOver={(e) => handlePatternDragOver(e, displayIndex)}
                        onDragLeave={handlePatternDragLeave}
                        onDrop={(e) => handlePatternDrop(e, displayIndex)}
                        onDragEnd={handlePatternDragEnd}
                        draggable={lockedMode && numberOfPatterns > 1}
                        title={
                          lockedMode && numberOfPatterns > 1
                            ? `Drag to reorder pattern ${patternIndex + 1}`
                            : ""
                        }
                        className={`items-center justify-center cursor-pointer border flex m-0.5 text-white transition-all duration-150 ${
                          isDragTarget ? "bg-blue-900/50" : ""
                        } ${isDragging ? "z-10" : ""} ${
                          lockedMode && numberOfPatterns > 1 ? "hover:bg-zinc-800" : ""
                        }`}
                      >
                        <div style={{ fontSize: 8 }}>{patternIndex + 1}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-1 cursor-pointer bg-zinc-900 rounded hover:bg-zinc-800"
                    onClick={newPattern}
                  >
                    <PlusCircledIcon
                      style={{ width: cellSize * 0.6, height: cellSize * 0.6 }}
                      className="mx-auto"
                      color="white"
                    />
                  </button>
                  <button
                    className="p-1 cursor-pointer bg-zinc-900 rounded hover:bg-zinc-800"
                    onClick={deletePattern}
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
              {patternDisplayOrder.map((patternIndex, displayIndex) => {
                const isCurrentPattern = patternIndex === currentPattern;
                const isDragging = draggingPattern === patternIndex;
                const isDragTarget = dragOverPattern === displayIndex;

                return (
                  <div
                    key={patternIndex}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      opacity: isDragging ? 0.5 : 1,
                      transform: isDragging ? "rotate(5deg) scale(1.05)" : "none",
                      borderColor: isDragTarget ? "#3b82f6" : isCurrentPattern ? "#fff" : "#6b7280",
                      borderWidth: isDragTarget ? "2px" : "1px",
                      boxShadow: isDragging ? "0 4px 8px rgba(0,0,0,0.3)" : "none",
                    }}
                    onClick={() => switchToPattern(patternIndex)}
                    onDragStart={(e) => handlePatternDragStart(e, patternIndex)}
                    onDragOver={(e) => handlePatternDragOver(e, displayIndex)}
                    onDragLeave={handlePatternDragLeave}
                    onDrop={(e) => handlePatternDrop(e, displayIndex)}
                    onDragEnd={handlePatternDragEnd}
                    draggable={lockedMode && numberOfPatterns > 1}
                    title={
                      lockedMode && numberOfPatterns > 1
                        ? `Drag to reorder pattern ${patternIndex + 1}`
                        : ""
                    }
                    className={`items-start cursor-pointer border flex m-0.5 text-white transition-all duration-150 ${
                      isDragTarget ? "bg-blue-900/50" : ""
                    } ${isDragging ? "z-10" : ""} ${
                      lockedMode && numberOfPatterns > 1 ? "hover:bg-zinc-800" : ""
                    }`}
                  >
                    <div style={{ fontSize: 8 }} className="m-auto">
                      {patternIndex + 1}
                    </div>
                  </div>
                );
              })}
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
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.objectNode.id === nextProps.objectNode.id &&
      prevProps.currentSlot === nextProps.currentSlot &&
      prevProps.value === nextProps.value &&
      prevProps.targetNode?.id === nextProps.targetNode?.id &&
      prevProps.presetManager === nextProps.presetManager
    );
  },
);

PresetBase.displayName = "PresetBase";
export default PresetBase;
