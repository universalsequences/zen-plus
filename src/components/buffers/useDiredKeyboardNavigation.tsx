import { useCallback, useEffect, useRef, KeyboardEvent } from "react";
import { Buffer, BufferType } from "@/lib/tiling/types";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { ObjectNode } from "@/lib/nodes/types";
import { usePatches } from "@/contexts/PatchesContext";

interface UseDiredKeyboardNavigationProps {
  buffer: Buffer;
  currentPatch: Patch | null;
  setCurrentPatch: (patch: Patch | null) => void;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  entryRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  entriesCountRef: React.MutableRefObject<number>;
  entriesContainerRef: React.RefObject<HTMLDivElement>;
  editingPatchIndex: number | null;
  setEditingPatchIndex: (index: number | null) => void;
  editingName: string;
  setEditingName: (name: string) => void;
  nameInputRef: React.RefObject<HTMLInputElement>;
  rootDivRef: React.RefObject<HTMLDivElement>;
  subpatches: ObjectNode[];
  regularObjects: ObjectNode[];
  commandText: string;
  setCommandText?: (text: string) => void;
  handleCurrentClick: (newTile: boolean | React.MouseEvent<HTMLDivElement>) => void;
  handleParentClick: () => void;
  handleObjectNodeClick: (objectNode: ObjectNode, newTile: boolean) => void;
}

export const useDiredKeyboardNavigation = ({
  buffer,
  currentPatch,
  setCurrentPatch,
  selectedIndex,
  setSelectedIndex,
  entryRefs,
  entriesCountRef,
  entriesContainerRef,
  editingPatchIndex,
  setEditingPatchIndex,
  editingName,
  setEditingName,
  nameInputRef,
  rootDivRef,
  subpatches,
  regularObjects,
  commandText,
  setCommandText,
  handleCurrentClick,
  handleParentClick,
  handleObjectNodeClick,
}: UseDiredKeyboardNavigationProps) => {
  const { selectedBuffer, renamePatch } = usePatches();

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't process keyboard events if this isn't the selected buffer
      if (selectedBuffer?.id !== buffer.id) return;

      // Special key handling for ESC to clear the command/filter
      if (e.key === "Escape" && commandText && setCommandText) {
        e.preventDefault();
        e.stopPropagation();
        setCommandText("");
        return;
      }

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
          if (e.metaKey) {
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
          }
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min((prev as number) + 1, (entriesCount as number) - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();

          // Get current filtering state
          const isFiltering = commandText.length > 0;
          const dotMatches = ".".includes(commandText.toLowerCase());
          const dotDotMatches = "..".includes(commandText.toLowerCase());
          const showDot = !isFiltering || dotMatches;
          const showDotDot =
            (!isFiltering || dotDotMatches) && (currentPatch as SubPatch).parentPatch;

          // Create a map of what's visible to help with index mapping
          const visibleMap = {
            dot: showDot,
            dotdot: showDotDot,
            hasDot: showDot,
            hasDotDot: showDotDot,
            dotIndex: -1,
            dotdotIndex: -1,
            objectStartIndex: 0,
          };

          // Calculate indices based on what's visible
          if (visibleMap.hasDot) {
            visibleMap.dotIndex = 0;
            visibleMap.objectStartIndex++;
          }

          if (visibleMap.hasDotDot) {
            visibleMap.dotdotIndex = visibleMap.objectStartIndex;
            visibleMap.objectStartIndex++;
          }

          // Check what kind of entry we're on based on visible elements
          if (showDot && selectedIndex === visibleMap.dotIndex) {
            // "." entry - open current patch
            handleCurrentClick(e.metaKey);
          } else if (showDotDot && selectedIndex === visibleMap.dotdotIndex) {
            // ".." entry - navigate to parent
            handleParentClick();
          } else {
            // Object node entry
            // Calculate which object node this is based on what's visible
            let objectIndex = selectedIndex - visibleMap.objectStartIndex;

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
      editingPatchIndex,
      editingName,
      renamePatch,
      buffer.id,
      selectedBuffer,
      commandText,
      setCommandText,
      entryRefs,
      entriesCountRef,
      setSelectedIndex,
      setEditingPatchIndex,
      setEditingName,
      nameInputRef,
      rootDivRef,
      buffer,
      handleObjectNodeClick,
      setCurrentPatch,
    ],
  );

  // Set up the global keyboard event listener
  useEffect(() => {
    const rootDiv = rootDivRef.current;
    if (rootDiv) {
      // Add a global event listener to ensure we can always capture key events
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Handle ESC to clear filtering
        if (e.key === "Escape" && commandText && setCommandText) {
          e.preventDefault();
          setCommandText("");
          return;
        }

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
              // Get current filtering state for the global handler too
              const isFiltering = commandText.length > 0;
              const dotMatches = ".".includes(commandText.toLowerCase());
              const dotDotMatches = "..".includes(commandText.toLowerCase());
              const showDot = !isFiltering || dotMatches;
              const showDotDot =
                (!isFiltering || dotDotMatches) && (currentPatch as SubPatch).parentPatch;

              // Create a map of what's visible to help with index mapping
              const visibleMap = {
                dot: showDot,
                dotdot: showDotDot,
                hasDot: showDot,
                hasDotDot: showDotDot,
                dotIndex: -1,
                dotdotIndex: -1,
                objectStartIndex: 0,
              };

              // Calculate indices based on what's visible
              if (visibleMap.hasDot) {
                visibleMap.dotIndex = 0;
                visibleMap.objectStartIndex++;
              }

              if (visibleMap.hasDotDot) {
                visibleMap.dotdotIndex = visibleMap.objectStartIndex;
                visibleMap.objectStartIndex++;
              }

              // Check what kind of entry we're on based on visible elements
              if (showDot && selectedIndex === visibleMap.dotIndex) {
                // "." entry - open current patch
                handleCurrentClick(e.metaKey);
              } else if (showDotDot && selectedIndex === visibleMap.dotdotIndex) {
                // ".." entry - navigate to parent
                handleParentClick();
                setSelectedIndex(0);
              } else {
                // Object node entry
                // Calculate which object node this is based on what's visible
                let objectIndex = selectedIndex - visibleMap.objectStartIndex;

                // First check subpatches
                if (objectIndex < subpatches.length) {
                  // It's a subpatch
                  const node = subpatches[objectIndex];
                  if (node.subpatch) {
                    setCurrentPatch(node.subpatch);
                    setSelectedIndex(0);
                  }
                } else {
                  // It's a regular object
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

      window.addEventListener("keydown", handleGlobalKeyDown as any);
      return () => {
        window.removeEventListener("keydown", handleGlobalKeyDown as any);
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
    rootDivRef,
    entryRefs,
    entriesContainerRef,
    setSelectedIndex,
    commandText,
    setCommandText,
  ]);

  return {
    handleKeyDown,
  };
};
