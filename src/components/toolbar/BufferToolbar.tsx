import { usePatches } from "@/contexts/PatchesContext";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { BufferType, type Buffer } from "@/lib/tiling/types";
import { useBuffer } from "@/contexts/BufferContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalKeyBindingsContext } from "../GlobalKeyBindingsProvider";

export const BufferToolbar: React.FC<{ buffer: Buffer }> = ({ buffer }) => {
  const {
    patchDragging,
    setPatchDragging,
    changeTileForPatch,
    selectedBuffer,
    zenCode,
    selectedPatch,
    closePatch,
    patches,
    setPatches,
    patchNames,
    setPatchNames,
  } = usePatches();

  const { keyCommand } = useGlobalKeyBindingsContext();

  const { commandText, setCommandText } = useBuffer();

  const isSelected = buffer === selectedBuffer;

  const name =
    buffer.type === BufferType.BufferList
      ? "*buffer-list*"
      : buffer.type === BufferType.Dired
        ? "*dired*"
        : buffer.type === BufferType.Object
          ? buffer.objectNode?.name
          : "";

  // Function to generate breadcrumb path
  const generateBreadcrumb = useCallback((currentPatch: Patch) => {
    if (!currentPatch) return "";

    let path = "";
    let current: Patch | null = currentPatch;
    const parts: string[] = [];

    // Build path from current patch up through parents
    while (current) {
      const name = current.name || (!(current as SubPatch).parentPatch ? "Root Patch" : "Untitled");

      parts.unshift(name);

      // Move to parent if exists
      current = (current as SubPatch).parentPatch || null;
    }

    // Join with separator
    return parts.join(" > ");
  }, []);

  // Only use command text if this buffer is selected
  const showCommandInput = isSelected;

  // For cursor blinking
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorPosition, setCursorPosition] = useState(commandText.length);
  const commandRef = useRef<HTMLDivElement>(null);

  // Handle cursor blinking
  useEffect(() => {
    if (!isSelected) return;

    const blinkInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    return () => clearInterval(blinkInterval);
  }, [isSelected]);

  // Handle keyboard events for the custom input
  useEffect(() => {
    if (!isSelected || buffer.type === BufferType.Object) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (keyCommand) {
        return;
      }
      if (e.key === "Escape") {
        // Clear command on escape
        setCommandText("");
        setCursorPosition(0);
        return;
      }

      if (e.key === "Enter") {
        // Execute command
        console.log("Command entered:", commandText);
        setCommandText("");
        setCursorPosition(0);
        return;
      }

      if (e.key === "Backspace") {
        if (cursorPosition > 0) {
          // Remove character before cursor
          const newText =
            commandText.substring(0, cursorPosition - 1) + commandText.substring(cursorPosition);
          setCommandText(newText);
          setCursorPosition((prev) => Math.max(0, prev - 1));
        }
        return;
      }

      if (e.key === "Delete") {
        if (cursorPosition < commandText.length) {
          // Remove character at cursor
          const newText =
            commandText.substring(0, cursorPosition) + commandText.substring(cursorPosition + 1);
          setCommandText(newText);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        // Move cursor left
        setCursorPosition((prev) => Math.max(0, prev - 1));
        return;
      }

      if (e.key === "ArrowRight") {
        // Move cursor right
        setCursorPosition((prev) => Math.min(commandText.length, prev + 1));
        return;
      }

      if (e.key === "Home") {
        // Move cursor to start
        setCursorPosition(0);
        return;
      }

      if (e.key === "End") {
        // Move cursor to end
        setCursorPosition(commandText.length);
        return;
      }

      // Only add printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Insert character at cursor position
        const newText =
          commandText.substring(0, cursorPosition) + e.key + commandText.substring(cursorPosition);
        setCommandText(newText);
        setCursorPosition((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, commandText, buffer, cursorPosition, setCommandText, keyCommand]);

  // When command text changes externally, move cursor to end
  useEffect(() => {
    if (isSelected) {
      setCursorPosition(commandText.length);
    }
  }, [commandText, isSelected]);

  return (
    <div
      style={{
        backdropFilter: "blur(8px)",
        backgroundColor: isSelected ? "#0032ffb8" : "#373c4469",
      }}
      className={`px-2 text-xs h-8 w-full flex ${isSelected ? "" : ""}`}
    >
      <div className="my-auto mr-2">{name}</div>
      <div className="my-auto text-zinc-400">
        {buffer.objectNode
          ? generateBreadcrumb((buffer.objectNode.patch as SubPatch).parentPatch) + " > "
          : ""}
      </div>
      <div className="my-auto text-zinc-100 ml-1">
        {buffer.objectNode ? buffer.objectNode.patch.name : ""}
      </div>
      {showCommandInput && (
        <div className="ml-2 flex items-center">
          <div
            ref={commandRef}
            className="px-2 py-1 text-xs rounded text-white font-mono min-w-[160px] relative my-auto "
          >
            {keyCommand ? (
              `${keyCommand.type}-${keyCommand.key}`
            ) : commandText === "" ? (
              ""
            ) : (
              <>
                <span>{commandText.substring(0, cursorPosition)}</span>
                {
                  <span
                    className="absolute bg-white w-[2px] h-[14px] animate-pulse"
                    style={{
                      left: `calc(${cursorPosition}ch + 0.5rem)`,
                      top: "4px",
                    }}
                  />
                }
                <span>{commandText.substring(cursorPosition)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
