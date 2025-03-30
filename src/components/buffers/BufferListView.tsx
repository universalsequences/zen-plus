import React, { useCallback, useState, useEffect, useRef, KeyboardEvent, useMemo } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { Buffer, BufferType, Tile } from "@/lib/tiling/types";
import { BoxModelIcon, CircleIcon, CubeIcon } from "@radix-ui/react-icons";
import { useBuffer } from "@/contexts/BufferContext";

interface BufferListViewProps {
  buffer: Buffer;
}

/**
 * BufferListView displays a list of available buffers that users can click on to switch to
 */
const BufferListView: React.FC<BufferListViewProps> = ({ buffer }) => {
  const {
    workingBuffers,
    switchToBuffer,
    rootTile,
    getAllTilesWithBuffer,
    killCurrentBuffer,
    closeTile,
    setSelectedBuffer,
    selectedBuffer,
    renamePatch,
  } = usePatches();

  // State to track selected buffer in the list for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  // State for editing buffer name
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  // Refs to the buffer item elements for scrolling
  const bufferItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  // Ref to the container element
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Ref to the visible buffers (excluding current buffer)
  const visibleBuffersRef = useRef<Buffer[]>([]);
  // Ref for the name input element
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Function to get a readable buffer type label
  const getBufferTypeLabel = (type: BufferType): string => {
    switch (type) {
      case BufferType.Patch:
        return "Patch";
      case BufferType.Object:
        return "Object";
      case BufferType.Dired:
        return "Directory";
      case BufferType.BufferList:
        return "Buffer List";
      default:
        return "Unknown";
    }
  };

  // Get command text for filtering
  const { commandText, setCommandText } = useBuffer();

  // Get visible buffers directly from workingBuffers to ensure we always have them
  // This creates a new filtered array on each render instead of relying on the ref
  const visibleBuffers = React.useMemo(() => {
    return workingBuffers.filter((b) => {
      // Always exclude the current buffer
      if (b.id === buffer.id) return false;

      // If no command text, include all other buffers
      if (!commandText) return true;

      // Search in buffer name, patch name, and object node text
      const searchTerm = commandText.toLowerCase();
      const bufferName = (b.name || "").toLowerCase();
      const patchName = b.patch ? (b.patch.name || "").toLowerCase() : "";
      const objectText = b.objectNode ? (b.objectNode.text || "").toLowerCase() : "";

      return (
        bufferName.includes(searchTerm) ||
        patchName.includes(searchTerm) ||
        objectText.includes(searchTerm)
      );
    });
  }, [workingBuffers, buffer.id, commandText]);

  // Update refs and selection index when visible buffers change
  useEffect(() => {
    // Reset selection when filtered list changes
    setSelectedIndex(0);

    // Reset refs array for the new list
    bufferItemsRef.current = Array(visibleBuffers.length).fill(null);

    // Store the visible buffers in the ref for any code that relies on it
    visibleBuffersRef.current = visibleBuffers;
  }, [visibleBuffers]);

  // Function to handle buffer selection with special case handling
  const handleBufferSelect = useCallback(
    (selectedBuffer: Buffer) => {
      if (!rootTile) return;

      console.log("Buffer selected:", selectedBuffer.id);

      // Find the current buffer list tile
      const currentTile = rootTile.findBuffer(buffer.id);
      console.log("Current buffer list tile:", currentTile?.id);

      if (!currentTile) {
        console.log("Current tile not found");
        return;
      }

      // Check if buffer is already displayed in other tiles (excluding current buffer list tile)
      const tilesWithBuffer = getAllTilesWithBuffer(selectedBuffer.id);
      const otherTilesWithBuffer = tilesWithBuffer.filter((tile) => tile.id !== currentTile.id);
      const isAlreadyDisplayed = otherTilesWithBuffer.length > 0;
      console.log("Buffer already displayed:", isAlreadyDisplayed);

      if (isAlreadyDisplayed) {
        // If buffer is already displayed elsewhere, just close this tile and select that buffer
        console.log("Closing buffer list tile and selecting existing buffer");

        // First set the selected buffer

        // Then close this tile - this is important for the order
        //closeTile(currentTile);
        killCurrentBuffer();
        setSelectedBuffer(selectedBuffer);
      } else {
        // Buffer is not displayed anywhere, switch to it in the current tile
        console.log("Switching to buffer in current tile");
        switchToBuffer(selectedBuffer);
      }
    },
    [
      rootTile,
      buffer.id,
      getAllTilesWithBuffer,
      closeTile,
      setSelectedBuffer,
      switchToBuffer,
      killCurrentBuffer,
    ],
  );

  // Function to check if a buffer is already displayed in any tile
  const isBufferDisplayed = useCallback(
    (bufferToCheck: Buffer): boolean => {
      if (!rootTile) return false;

      // Get all tiles showing this buffer
      const tilesWithBuffer = getAllTilesWithBuffer(bufferToCheck.id);

      // Get the current buffer list tile
      const currentTile = rootTile.findBuffer(buffer.id);

      // Count only tiles that are not the current buffer list tile
      const otherTilesWithBuffer = tilesWithBuffer.filter(
        (tile) => !currentTile || tile.id !== currentTile.id,
      );

      return otherTilesWithBuffer.length > 0;
    },
    [rootTile, getAllTilesWithBuffer, buffer.id],
  );

  // Set up keyboard navigation handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Only process keyboard navigation if this is the selected buffer
      if (selectedBuffer?.id !== buffer.id) return;

      // Special key handling for ESC to clear the command/filter
      if (e.key === "Escape" && commandText) {
        e.preventDefault();
        e.stopPropagation();
        setCommandText("");
        return;
      }

      // If we're currently editing a name, handle special keys
      if (editingIndex !== null) {
        if (e.key === "Enter") {
          e.preventDefault();
          // Save the rename
          const selectedBuf = visibleBuffers[editingIndex];
          if (selectedBuf && selectedBuf.type === BufferType.Patch && selectedBuf.patch) {
            renamePatch(selectedBuf.patch, editingName.trim());
          }

          // Exit rename mode
          setEditingIndex(null);
          setEditingName("");

          // Restore focus to container
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.focus();
            }
          }, 10);
          return;
        } else if (e.key === "Escape") {
          e.preventDefault();
          // Cancel rename
          setEditingIndex(null);
          setEditingName("");

          // Restore focus to container
          setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.focus();
            }
          }, 10);
          return;
        }
        // Let other key events pass through for typing
        return;
      }

      // Don't handle keyboard events from input elements
      if (
        e.target &&
        ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
          (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
      ) {
        return;
      }

      if (visibleBuffers.length === 0) return;

      switch (e.key) {
        case "R":
        case "r":
          e.preventDefault();
          // Handle rename for patch buffers
          if (selectedIndex >= 0 && selectedIndex < visibleBuffers.length) {
            const selectedBuf = visibleBuffers[selectedIndex];
            // Only allow renaming buffers that are patch type and have a patch reference
            if (selectedBuf.type === BufferType.Patch && selectedBuf.patch) {
              setEditingIndex(selectedIndex);
              setEditingName(selectedBuf.patch.name || selectedBuf.name || "");

              // Focus the input on next render
              setTimeout(() => {
                if (nameInputRef.current) {
                  nameInputRef.current.focus();
                  nameInputRef.current.select();
                }
              }, 10);
            }
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, visibleBuffers.length - 1);
            // Scroll selected item into view
            setTimeout(() => {
              bufferItemsRef.current[newIndex]?.scrollIntoView({ block: "nearest" });
            }, 10);
            return newIndex;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            // Scroll selected item into view
            setTimeout(() => {
              bufferItemsRef.current[newIndex]?.scrollIntoView({ block: "nearest" });
            }, 10);
            return newIndex;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < visibleBuffers.length) {
            const selectedBuf = visibleBuffers[selectedIndex];
            // Visual feedback for click
            const element = bufferItemsRef.current[selectedIndex];
            if (element) {
              element.classList.add("active-click");
              setTimeout(() => {
                element.classList.remove("active-click");
              }, 200);
            }
            handleBufferSelect(selectedBuf);
          }
          break;
      }
    },
    [
      selectedIndex,
      handleBufferSelect,
      buffer.id,
      selectedBuffer,
      editingIndex,
      editingName,
      renamePatch,
      visibleBuffers,
      commandText,
      setCommandText,
    ],
  );

  // Set up focus handling and global keyboard event handler
  useEffect(() => {
    const rootElement = containerRef.current;
    if (rootElement) {
      // Focus the element to capture keyboard events, but only if this is the selected buffer
      if (selectedBuffer?.id === buffer.id) {
        setTimeout(() => {
          rootElement.focus();
        }, 100);
      }

      // Add global event listener for keyboard navigation
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Only process keyboard events if this is the selected buffer
        if (selectedBuffer?.id !== buffer.id) return;

        // Handle ESC to clear filter
        if (e.key === "Escape" && commandText) {
          e.preventDefault();
          setCommandText("");
          return;
        }

        // Skip if we're editing
        if (editingIndex !== null) return;

        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "Enter" ||
          e.key === "R" ||
          e.key === "r"
        ) {
          // Ensure our container has focus
          const isBufferListActive = rootElement.contains(document.activeElement);
          if (isBufferListActive && document.activeElement !== rootElement) {
            rootElement.focus();
            e.preventDefault();

            if (visibleBuffers.length === 0) return;

            if (e.key === "ArrowDown") {
              setSelectedIndex((prev) => Math.min(prev + 1, visibleBuffers.length - 1));
            } else if (e.key === "ArrowUp") {
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              if (selectedIndex >= 0 && selectedIndex < visibleBuffers.length) {
                const selectedBuf = visibleBuffers[selectedIndex];
                handleBufferSelect(selectedBuf);

                // Visual feedback
                const element = bufferItemsRef.current[selectedIndex];
                if (element) {
                  element.classList.add("active-click");
                  setTimeout(() => {
                    element.classList.remove("active-click");
                  }, 200);
                }
              }
            }
          }
        }
      };

      window.addEventListener("keydown", handleGlobalKeyDown);
      return () => {
        window.removeEventListener("keydown", handleGlobalKeyDown);
      };
    }
  }, [
    buffer.id,
    selectedBuffer,
    selectedIndex,
    handleBufferSelect,
    visibleBuffers,
    commandText,
    setCommandText,
  ]);

  // Function to set a ref for a buffer item element
  const setBufferItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (bufferItemsRef.current && index >= 0 && index < bufferItemsRef.current.length) {
      bufferItemsRef.current[index] = el;
    }
  }, []);

  // Render a buffer list item with click handler
  const renderBufferItem = useCallback(
    (b: Buffer, index: number) => {
      // Don't show the current buffer list in the list
      if (b.id === buffer.id) return null;

      // Check if this buffer is already displayed
      const displayed = isBufferDisplayed(b);

      // Get a display name for the buffer
      let displayName = b.name || `Untitled ${getBufferTypeLabel(b.type)}`;

      // For Dired buffers, show which patch they're browsing
      if (b.type === BufferType.Dired && b.patch) {
        displayName = b.patch.name ? `Directory: ${b.patch.name}` : "Directory Browser";
      } else if (b.patch?.name) {
        if (b.objectNode) {
          displayName = b.objectNode?.text + " (" + b.patch.name + ")";
        } else {
          displayName = b.patch.name;
        }
      }

      // Check if this item is selected (for keyboard navigation)
      const isSelected = index === selectedIndex;
      const isEditing = index === editingIndex;

      return (
        <div
          key={b.id}
          ref={(el) => setBufferItemRef(el, index)}
          className={`buffer-item px-2 py-1 text-xs my-1 border cursor-pointer transition-colors
            ${displayed ? "border-l-2 border-blue-500" : ""}
            ${isSelected ? "border-orange-500" : "border-transparent"}
            [&.active-click]:bg-blue-500`}
          onClick={() => handleBufferSelect(b)}
          data-index={index}
        >
          <div className="flex   flex">
            {b.type === BufferType.Object ? (
              <CubeIcon className="w-3 h-3 my-auto mr-5" />
            ) : b.type === BufferType.Patch ? (
              <BoxModelIcon className="w-3 h-3 my-auto mr-5" />
            ) : null}
            {isEditing ? (
              <input
                ref={nameInputRef}
                className="bg-zinc-800 text-white px-1 py-0.5 font-medium w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Prevent event bubbling for all keys
                  e.stopPropagation();

                  // Handle special keys
                  if (e.key === "Enter") {
                    if (b.patch && editingName.trim()) {
                      renamePatch(b.patch, editingName.trim());
                    }
                    setEditingIndex(null);
                    setEditingName("");

                    // Restore focus
                    setTimeout(() => {
                      if (containerRef.current) {
                        containerRef.current.focus();
                      }
                    }, 10);
                  } else if (e.key === "Escape") {
                    setEditingIndex(null);
                    setEditingName("");

                    // Restore focus
                    setTimeout(() => {
                      if (containerRef.current) {
                        containerRef.current.focus();
                      }
                    }, 10);
                  }
                }}
                // Use mouseDown to prevent focus issues
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                // Improved blur handling
                onBlur={(e) => {
                  // Delay to prevent immediate cancel
                  setTimeout(() => {
                    if (document.activeElement !== nameInputRef.current) {
                      setEditingIndex(null);
                      setEditingName("");
                    }
                  }, 100);
                }}
              />
            ) : (
              <span className="buffer-name text-xs">{displayName}</span>
            )}
            {displayed && <CircleIcon className="ml-3 my-auto w-3 h-3" stroke="#00fffd" />}
            <div className="flex items-center ml-auto text-xs">
              <span className="buffer-type  text-zinc-400 mr-2">{getBufferTypeLabel(b.type)}</span>
              {isSelected && !isEditing && <span className="text-xs">⏎</span>}
            </div>
          </div>
          {b.type === BufferType.Patch && b.patch?.description && !isEditing && (
            <div className="buffer-description text-sm text-zinc-400 mt-1">
              {b.patch.description}
            </div>
          )}
        </div>
      );
    },
    [
      buffer.id,
      isBufferDisplayed,
      handleBufferSelect,
      selectedIndex,
      setBufferItemRef,
      editingIndex,
      editingName,
      renamePatch,
      visibleBuffers,
    ],
  );

  // Handle click on container to ensure focus and proper selection
  const handleContainerClick = useCallback(() => {
    // Focus the container and set this buffer as selected
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="buffer-list w-full p-10 h-full overflow-auto text-white flex flex-col"
      onKeyDown={handleKeyDown}
      onClick={handleContainerClick}
      tabIndex={0}
      style={{
        background: "#1c1c1c8f",
        backdropFilter: "blur(32px)",
      }}
    >
      <div className="buffer-items flex-grow overflow-y-auto">
        {visibleBuffers.length === 0 ? (
          <div className="empty-message p-2 text-zinc-400">
            {commandText ? `No buffers matching "${commandText}"` : "No buffers available"}
          </div>
        ) : (
          <>
            {commandText && (
              <div className="filter-info text-xs text-blue-400 p-2">Filtering: {commandText}</div>
            )}
            {visibleBuffers.map((b, index) => renderBufferItem(b, index))}
          </>
        )}
      </div>

      <div className="help-text mt-4 text-xs text-zinc-500 flex-shrink-0">
        <p>Press 'b' to show/hide buffer list</p>
        <p>Use arrow keys ↑↓ to navigate, Enter to select</p>
        <p>Press 'r' on a patch buffer to rename it</p>
        <p>Type to filter buffers by name</p>
        <p>Buffers with blue border are already displayed in another tile</p>
      </div>
    </div>
  );
};

export default BufferListView;
