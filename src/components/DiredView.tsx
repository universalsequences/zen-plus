import React, { useCallback, useEffect, useState, useRef, KeyboardEvent } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { Buffer, BufferType } from "@/lib/tiling/types";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { type ObjectNode } from "@/lib/nodes/types";
import { BoxModelIcon, CubeIcon } from "@radix-ui/react-icons";

interface DiredViewProps {
  buffer: Buffer;
}

/**
 * DiredView displays a directory-like view of a patch's objectNodes
 */
const DiredView: React.FC<DiredViewProps> = ({ buffer }) => {
  const {
    selectedPatch,
    selectedBuffer,
    switchToBuffer,
    expandPatch,
    getAllTilesWithBuffer,
    renamePatch,
    setWorkingBuffers,
  } = usePatches();

  // State to track the current patch we're displaying
  const [currentPatch, setCurrentPatch] = useState<Patch | null>(null);
  // State to track selected entry index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  // Ref to keep track of all navigable entries
  const entryRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Ref to the entries container for scrolling
  const entriesContainerRef = useRef<HTMLDivElement | null>(null);
  // State for editing patch name
  const [editingPatchIndex, setEditingPatchIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  // Ref for name input
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize the current patch when component mounts or selectedPatch changes
  useEffect(() => {
    // Use the patch from buffer if specified, otherwise use selectedPatch
    const patchToUse = buffer.patch || selectedPatch;
    setCurrentPatch(patchToUse);
    // Reset selection to first item
    setSelectedIndex(0);
  }, [buffer.patch, selectedPatch]);

  // Function to handle clicking on an object node
  const handleObjectNodeClick = useCallback(
    (objectNode: ObjectNode, newTile: boolean) => {
      if (objectNode.subpatch) {
        // If the object has a subpatch, navigate to it within Dired
        setCurrentPatch(objectNode.subpatch);
      } else {
        // For regular objects, create an Object buffer
        const objectBuffer: Buffer = {
          id: objectNode.id,
          type: BufferType.Object,
          objectNode: objectNode,
          name: objectNode.text || "Object View",
          patch: objectNode.patch, // Reference the object's patch for context
        };

        switchToBuffer(objectBuffer, newTile);
      }
    },
    [switchToBuffer, setWorkingBuffers],
  );

  // Function to handle clicking on parent patch (..)
  const handleParentClick = useCallback(() => {
    if (currentPatch && (currentPatch as SubPatch).parentPatch) {
      const parentPatch = (currentPatch as SubPatch).parentPatch;

      buffer.patch = parentPatch;
      // Just navigate to the parent patch within Dired
      setCurrentPatch(parentPatch);
    }
  }, [currentPatch]);

  // Function to handle clicking on current patch (.)
  const handleCurrentClick = useCallback(
    (newTile: boolean | React.MouseEvent<HTMLDivElement>) => {
      if (currentPatch) {
        // Create a buffer for the current patch
        const currentBuffer: Buffer = {
          id: currentPatch.id,
          type: BufferType.Patch,
          patch: currentPatch,
          name: currentPatch.name || "Current Patch",
        };

        setWorkingBuffers((prev) => [currentBuffer, ...prev]);
        // Switch to the current patch buffer
        switchToBuffer(
          currentBuffer,
          newTile === true || (newTile as React.MouseEvent<HTMLDivElement>).metaKey,
        );
      }
    },
    [currentPatch, switchToBuffer],
  );

  // Reference to track the most recent count of entries
  const entriesCountRef = useRef<number>(0);

  // Organize objects: subpatches first, then regular objects
  const organizeObjects = useCallback(() => {
    if (!currentPatch) return { subpatches: [], regularObjects: [] };

    const subpatches: ObjectNode[] = [];
    const regularObjects: ObjectNode[] = [];

    currentPatch.objectNodes.forEach((node) => {
      if (node.subpatch) {
        subpatches.push(node);
      } else {
        regularObjects.push(node);
      }
    });

    return { subpatches, regularObjects };
  }, [currentPatch]);

  // Get organized objects - needs to be called unconditionally
  const { subpatches, regularObjects } = currentPatch
    ? organizeObjects()
    : { subpatches: [], regularObjects: [] };

  // Update the entry count whenever patch, subpatches, or regularObjects change
  useEffect(() => {
    if (currentPatch) {
      let count = 1; // "." entry
      if ((currentPatch as SubPatch).parentPatch) count++; // ".." entry
      count += subpatches.length + regularObjects.length;

      entriesCountRef.current = count;
    }
  }, [currentPatch, subpatches, regularObjects]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't process keyboard events if this isn't the selected buffer
      if (selectedBuffer?.id !== buffer.id) return;

      // If we're currently editing a name, handle special keys
      if (editingPatchIndex !== null) {
        if (e.key === "Enter") {
          e.preventDefault();
          // Save the rename
          let objectIndex = editingPatchIndex - 1; // Subtract "." entry
          if ((currentPatch as SubPatch).parentPatch) objectIndex--; // Subtract ".." entry if present

          if (objectIndex >= 0 && objectIndex < subpatches.length) {
            const node = subpatches[objectIndex];
            if (node.subpatch && editingName.trim()) {
              renamePatch(node.subpatch, editingName.trim());
            }
          }

          // Exit rename mode
          setEditingPatchIndex(null);
          setEditingName("");

          // Restore focus to container
          setTimeout(() => {
            if (rootDivRef.current) {
              rootDivRef.current.focus();
            }
          }, 10);
          return;
        } else if (e.key === "Escape") {
          e.preventDefault();
          // Cancel rename
          setEditingPatchIndex(null);
          setEditingName("");

          // Restore focus to container
          setTimeout(() => {
            if (rootDivRef.current) {
              rootDivRef.current.focus();
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

      // Use the entriesCountRef instead of filtering the refs array
      const entriesCount = entriesCountRef.current;

      if (entriesCount === 0) return;

      switch (e.key) {
        case "R":
        case "r":
          e.preventDefault();
          // Handle rename for subpatches
          let renameObjectIndex = selectedIndex - 1; // Subtract "." entry
          if ((currentPatch as SubPatch).parentPatch) renameObjectIndex--; // Subtract ".." entry if present

          // Only allow renaming subpatches
          if (renameObjectIndex >= 0 && renameObjectIndex < subpatches.length) {
            const node = subpatches[renameObjectIndex];
            if (node.subpatch) {
              setEditingPatchIndex(selectedIndex);
              setEditingName(node.subpatch.name || node.text || "");

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
            const newIndex = Math.min(prev + 1, entriesCount - 1);
            // Scroll selected item into view
            setTimeout(() => {
              if (entryRefs.current[newIndex]) {
                entryRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
              } else {
              }
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
              if (entryRefs.current[newIndex]) {
                entryRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
              } else {
              }
            }, 10);
            return newIndex;
          });
          break;
        case "Enter":
          e.preventDefault();

          // Check what kind of entry we're on
          if (selectedIndex === 0) {
            // "." entry - open current patch
            handleCurrentClick(e.metaKey);
          } else if (selectedIndex === 1 && (currentPatch as SubPatch).parentPatch) {
            // ".." entry - navigate to parent
            handleParentClick();
          } else {
            // Object node entry
            // Calculate which object node this is
            let objectIndex = selectedIndex - 1; // Subtract "." entry
            if ((currentPatch as SubPatch).parentPatch) objectIndex--; // Subtract ".." entry if present

            // First check subpatches
            if (objectIndex < subpatches.length) {
              // It's a subpatch
              const node = subpatches[objectIndex];
              if (node.subpatch) {
                buffer.patch = node.subpatch;
                setCurrentPatch(node.subpatch);
                setSelectedIndex(0);
              }
            } else {
              // It's a regular object
              objectIndex -= subpatches.length;
              if (objectIndex < regularObjects.length) {
                const node = regularObjects[objectIndex];
                // Regular objects may still have subpatches
                if (node.subpatch) {
                  setCurrentPatch(node.subpatch);
                  setSelectedIndex(0);
                } else {
                  // Create an Object buffer for the selected object
                  handleObjectNodeClick(node, e.metaKey);
                }
              }
            }
          }

          // Visual feedback on the selected element
          const element = entryRefs.current[selectedIndex];
          if (element) {
            element.classList.add("active-click");
            setTimeout(() => {
              element.classList.remove("active-click");
            }, 200);
          }
          break;
      }
    },
    [
      selectedIndex,
      currentPatch,
      subpatches,
      regularObjects,
      handleCurrentClick,
      handleParentClick,
      setCurrentPatch,
      editingPatchIndex,
      editingName,
      renamePatch,
      buffer.id,
      selectedBuffer,
    ],
  );

  // Create a ref for the root component div
  const rootDivRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Focus the container with a slight delay to ensure the DOM is fully rendered
    setTimeout(() => {
      const rootDiv = rootDivRef.current;
      if (rootDiv) {
        rootDiv.focus();
      }
    }, 100);
  }, []);

  // Set up the keyboard event listener and focus management
  useEffect(() => {
    // Add focus to the root div when mounting to capture keyboard events
    const rootDiv = rootDivRef.current;
    if (rootDiv) {
      // Add a global event listener to ensure we can always capture key events
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // For debugging

        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
          // If we're in the dired view but the active element is not our container,
          // focus our container and handle the event
          const isDiredViewActive = rootDiv.contains(document.activeElement);
          if (isDiredViewActive && document.activeElement !== rootDiv) {
            rootDiv.focus();
            e.preventDefault();

            if (e.key === "ArrowDown") {
              setSelectedIndex((prev) =>
                Math.min(prev + 1, entryRefs.current.filter(Boolean).length - 1),
              );
            } else if (e.key === "ArrowUp") {
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              // Use the same logic as the main handler
              if (selectedIndex === 0) {
                // "." entry
                handleCurrentClick(e.metaKey);
              } else if (selectedIndex === 1 && (currentPatch as SubPatch).parentPatch) {
                // ".." entry
                handleParentClick();
                setSelectedIndex(0);
              } else {
                // Object node
                let objectIndex = selectedIndex - 1;
                if ((currentPatch as SubPatch).parentPatch) objectIndex--;

                if (objectIndex < subpatches.length) {
                  // Subpatch
                  const node = subpatches[objectIndex];
                  if (node.subpatch) {
                    setCurrentPatch(node.subpatch);
                    setSelectedIndex(0);
                  }
                } else {
                  // Regular object
                  objectIndex -= subpatches.length;
                  if (objectIndex < regularObjects.length) {
                    const node = regularObjects[objectIndex];
                    if (node.subpatch) {
                      setCurrentPatch(node.subpatch);
                      setSelectedIndex(0);
                    } else {
                      // Create an Object buffer for the selected object
                      handleObjectNodeClick(node, e.metaKey);
                    }
                  }
                }
              }

              // Visual feedback
              const element = entryRefs.current[selectedIndex];
              if (element) {
                element.classList.add("active-click");
                setTimeout(() => {
                  element.classList.remove("active-click");
                }, 200);
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
    currentPatch,
    selectedIndex,
    subpatches,
    regularObjects,
    handleCurrentClick,
    handleParentClick,
    handleObjectNodeClick,
    setCurrentPatch,
  ]);

  // Function to set a ref for an entry at a specific index
  const setEntryRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (entryRefs.current && index >= 0 && index < entryRefs.current.length) {
      entryRefs.current[index] = el;
    } else {
    }
  }, []);

  // Render a directory entry with appropriate styling
  const renderDirectoryEntry = useCallback(
    (
      name: string,
      onClick: (e: boolean | React.MouseEvent<HTMLDivElement>) => void,
      isSpecial = false,
      index: number,
    ) => {
      const isSelected = selectedIndex === index;

      // Log for debugging

      return (
        <div
          ref={(el) => setEntryRef(el, index)}
          className={`directory-entry px-2 py-1 text-xs my-1 cursor-pointer transition-colors ${
            isSpecial ? "text-zinc-400" : ""
          } ${isSelected ? "bg-zinc-700" : ""} [&.active-click]:bg-zinc-500`}
          onClick={onClick}
          data-index={index}
        >
          <div className="flex items-center">
            <span className="directory-name font-mono">{name}</span>
            {isSelected && <span className="ml-auto text-xs">⏎</span>}
          </div>
        </div>
      );
    },
    [selectedIndex, setEntryRef],
  );

  // Function to generate breadcrumb path
  const generateBreadcrumb = useCallback(() => {
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
  }, [currentPatch]);

  // Reset entry refs array - moved before conditional return to ensure consistent hook calling
  useEffect(() => {
    if (currentPatch) {
      // Calculate how many entries we'll have
      let count = 1; // "." entry
      if ((currentPatch as SubPatch).parentPatch) count++; // ".." entry
      count += subpatches.length + regularObjects.length;

      // Resize the refs array - initialize with nulls
      entryRefs.current = Array(count).fill(null);

      // Make sure selectedIndex is valid for this number of entries
      if (selectedIndex >= count) {
        setSelectedIndex(0);
      }
    }
  }, [currentPatch, subpatches, regularObjects, selectedIndex]);

  // Calculate entry indexes for keyboard navigation
  let entryIndex = 0;

  // Render the component
  if (!currentPatch) {
    return <div className="p-4 text-white">No patch selected</div>;
  }

  return (
    <div
      ref={rootDivRef}
      className="dired-view w-full h-full overflow-y-auto bg-zinc-950 text-white flex flex-col focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onFocus={() => {
        // Make sure we have a valid selection when getting focus
        if (selectedIndex < 0 && entryRefs.current.length > 0) {
          setSelectedIndex(0);
        }
      }}
      style={{
        // Add some CSS for the active-click class
        ["--active-click-bg" as any]: "rgba(59, 130, 246, 0.5)", // zinc-500 with 50% opacity
      }}
    >
      <div className="flex-shrink-0 ">
        <div className="breadcrumb text-xs text-zinc-400 px-2 w-full py-1">
          {generateBreadcrumb()}
        </div>
      </div>

      <div
        ref={entriesContainerRef}
        className="directory-entries flex-grow h-96 overflow-y-auto focus:outline-none "
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Current patch (.) */}
        {renderDirectoryEntry(".", handleCurrentClick, true, entryIndex++)}

        {/* Parent patch (..) if available */}
        {(currentPatch as SubPatch).parentPatch &&
          renderDirectoryEntry("..", handleParentClick, true, entryIndex++)}

        {/* Subpatches first */}
        {subpatches.length > 0 && (
          <div className="subpatches-section mb-2">
            <div className="section-header text-xs text-zinc-500 px-2 pb-1">Subpatches</div>
            {subpatches.map((node) => {
              // Get subpatch name if available
              const subpatchName = (node.subpatch as SubPatch)?.name || node.text;
              const currentIndex = entryIndex++;
              const isSelected = selectedIndex === currentIndex;
              const isEditing = editingPatchIndex === currentIndex;

              return (
                <div
                  key={node.id}
                  ref={(el) => setEntryRef(el, currentIndex)}
                  className={`object-entry px-2 py-1 my-1 cursor-pointer text-xs transition-colors ${isSelected ? "bg-zinc-700" : ""} [&.active-click]:bg-zinc-500`}
                  onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                    handleObjectNodeClick(node, e.metaKey)
                  }
                  data-index={currentIndex}
                >
                  <div className="flex items-center">
                    <BoxModelIcon className="directory-icon mr-2 text-zinc-400 w-3 h-3" />
                    {isEditing ? (
                      <input
                        onClick={(e) => e.stopPropagation()}
                        ref={nameInputRef}
                        className="bg-zinc-800 text-white px-1 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        value={editingName}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          // Prevent event bubbling for all keys
                          e.stopPropagation();

                          // Handle special keys
                          if (e.key === "Enter") {
                            if (node.subpatch && editingName.trim()) {
                              renamePatch(node.subpatch, editingName.trim());
                            }
                            setEditingPatchIndex(null);
                            setEditingName("");

                            // Restore focus to main container
                            setTimeout(() => {
                              if (rootDivRef.current) {
                                rootDivRef.current.focus();
                              }
                            }, 10);
                          } else if (e.key === "Escape") {
                            setEditingPatchIndex(null);
                            setEditingName("");

                            // Restore focus to main container
                            setTimeout(() => {
                              if (rootDivRef.current) {
                                rootDivRef.current.focus();
                              }
                            }, 10);
                          }
                        }}
                        // Only cancel on blur if we need to
                        onBlur={(e) => {
                          // Don't cancel immediately - this was causing issues
                          const target = e.relatedTarget as HTMLElement;
                          // Delay to allow clicking on the input itself
                          setTimeout(() => {
                            // Only cancel if focus moved outside our component
                            if (document.activeElement !== nameInputRef.current) {
                              setEditingPatchIndex(null);
                              setEditingName("");
                            }
                          }, 100);
                        }}
                      />
                    ) : (
                      <span className="object-name ">{subpatchName}</span>
                    )}
                    {isSelected && !isEditing && <span className="ml-auto text-xs">⏎</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Regular objects */}
        {regularObjects.length > 0 && (
          <div className="objects-section">
            <div className="section-header text-xs text-zinc-500 px-2 pb-1">Objects</div>
            {regularObjects.map((node) => {
              const currentIndex = entryIndex++;
              const isSelected = selectedIndex === currentIndex;

              return (
                <div
                  key={node.id}
                  ref={(el) => setEntryRef(el, currentIndex)}
                  className={`object-entry px-2 py-1 my-1 cursor-pointer text-xs transition-colors ${isSelected ? "bg-zinc-700" : ""} [&.active-click]:bg-zinc-500`}
                  onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                    handleObjectNodeClick(node, e.metaKey)
                  }
                  data-index={currentIndex}
                >
                  <div className="flex items-center">
                    <CubeIcon className="directory-icon mr-2 text-gray-400 w-3 h-3" />
                    <span className="object-name ">{node.text}</span>
                    {isSelected && <span className="ml-auto text-xs">⏎</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {subpatches.length === 0 && regularObjects.length === 0 && (
          <div className="empty-message text-zinc-400 mt-4">No objects in this patch</div>
        )}
      </div>

      <div className="help-text mt-4 text-xs text-zinc-500 flex-shrink-0">
        <p>Use arrow keys ↑↓ to navigate, Enter to select</p>
        <p>Press R on a subpatch to rename it</p>
        <p>Click or press Enter on "." to exit and open the current patch</p>
        <p>Click or press Enter on ".." to navigate up to parent</p>
        <p>Click or press Enter on a subpatch to navigate into it</p>
        <p>Click or press Enter on a regular object to open it as a buffer</p>
      </div>
    </div>
  );
};

export default DiredView;
