import React, { useCallback, useEffect, useState, useRef } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { Buffer, BufferType } from "@/lib/tiling/types";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { ObjectNode } from "@/lib/nodes/types";
import { useBuffer } from "@/contexts/BufferContext";
import { useDiredKeyboardNavigation } from "./useDiredKeyboardNavigation";
import { DirectoryEntry, ObjectEntry } from "./DirectoryEntry";
import { organizeObjects } from "./organizeObjects";
import { generateBreadcrumb } from "./generateBreadcrumb";
import { SpatialLayoutView } from "./SpatialLayoutView";

interface DiredViewProps {
  buffer: Buffer;
}

/**
 * DiredView displays a directory-like view of a patch's objectNodes
 */
const DiredView: React.FC<DiredViewProps> = ({ buffer }) => {
  const { selectedPatch, selectedBuffer, switchToBuffer, setWorkingBuffers, renamePatch } =
    usePatches();

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
  // Create a ref for the root component div
  const rootDivRef = useRef<HTMLDivElement | null>(null);
  // Reference to track the most recent count of entries
  const entriesCountRef = useRef<number>(0);

  // Get command text to use for filtering
  const { commandText, setCommandText } = useBuffer();

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

  // Get organized objects based on current patch and filtering
  const { subpatches, regularObjects } = currentPatch
    ? organizeObjects(currentPatch, commandText)
    : { subpatches: [], regularObjects: [] };

  // Update the entry count whenever patch, subpatches, regularObjects, or filtering changes
  useEffect(() => {
    if (currentPatch) {
      let count = 0;

      // Only count special entries if they should be shown based on filtering
      const isFiltering = commandText.length > 0;
      const dotMatches = ".".includes(commandText.toLowerCase());
      const dotDotMatches = "..".includes(commandText.toLowerCase());

      // Count "." entry if not filtering or it matches
      if (!isFiltering || dotMatches) count++;

      // Count ".." entry if not filtering or it matches and parent exists
      if ((!isFiltering || dotDotMatches) && (currentPatch as SubPatch).parentPatch) count++;

      // Count filtered objects
      count += subpatches.length + regularObjects.length;

      entriesCountRef.current = count;
    }
  }, [currentPatch, subpatches, regularObjects, commandText]);
  
  // Reset selection index when command text changes (filtering)
  useEffect(() => {
    setSelectedIndex(0);
  }, [commandText]);

  // Set up keyboard navigation
  const { handleKeyDown } = useDiredKeyboardNavigation({
    buffer,
    currentPatch,
    setCurrentPatch,
    selectedIndex,
    setSelectedIndex,
    entryRefs,
    entriesCountRef,
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
  });

  // Focus the container with a slight delay to ensure the DOM is fully rendered
  useEffect(() => {
    setTimeout(() => {
      const rootDiv = rootDivRef.current;
      if (rootDiv) {
        rootDiv.focus();
      }
    }, 100);
  }, []);

  // Function to set a ref for an entry at a specific index
  const setEntryRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (entryRefs.current && index >= 0 && index < entryRefs.current.length) {
      entryRefs.current[index] = el;
    }
  }, []);

  // Reset entry refs array - moved before conditional return to ensure consistent hook calling
  useEffect(() => {
    if (currentPatch) {
      // Calculate how many entries we'll have, considering filtering
      let count = 0;

      // Only count special entries if they should be shown based on filtering
      const isFiltering = commandText.length > 0;
      const dotMatches = ".".includes(commandText.toLowerCase());
      const dotDotMatches = "..".includes(commandText.toLowerCase());

      // Count "." entry if not filtering or it matches
      if (!isFiltering || dotMatches) count++;

      // Count ".." entry if not filtering or it matches and parent exists
      if ((!isFiltering || dotDotMatches) && (currentPatch as SubPatch).parentPatch) count++;

      // Count filtered objects
      count += subpatches.length + regularObjects.length;

      // Resize the refs array - initialize with nulls
      entryRefs.current = Array(count).fill(null);

      // Make sure selectedIndex is valid for this number of entries
      if (selectedIndex >= count && count > 0) {
        setSelectedIndex(0);
      } else if (count === 0) {
        setSelectedIndex(-1); // No valid selection when empty
      }
    }
  }, [currentPatch, subpatches, regularObjects, selectedIndex, commandText]);

  // Check if we're filtering (has search text)
  const isFiltering = commandText.length > 0;

  // Check if special entries match the search
  const dotMatches = ".".includes(commandText.toLowerCase());
  const dotDotMatches = "..".includes(commandText.toLowerCase());

  // Should we show the special entries?
  const showDot = !isFiltering || dotMatches;
  const showDotDot = (!isFiltering || dotDotMatches) && 
    (currentPatch ? !!(currentPatch as SubPatch).parentPatch : false);

  // Find the index of the selected object in the combined array of subpatches and regularObjects
  const findSelectedObjectIndex = useCallback((selectedIdx: number, hasCurrentDot: boolean, hasParentDotDot: boolean): number => {
    // Calculate how many special entries are before the list of objects
    const specialEntryCount = (hasCurrentDot ? 1 : 0) + (hasParentDotDot ? 1 : 0);
    
    // If the selectedIndex is on a special entry, return -1 (no object selected)
    if (selectedIdx < specialEntryCount) {
      return -1;
    }
    
    // Calculate the adjusted index in the combined object array
    const adjustedIndex = selectedIdx - specialEntryCount;
    
    // If the adjusted index is within subpatches, return that index
    if (adjustedIndex < subpatches.length) {
      return adjustedIndex;
    }
    
    // If the adjusted index is within regularObjects, return that index adjusted by subpatches length
    const regularObjectIndex = adjustedIndex - subpatches.length;
    if (regularObjectIndex < regularObjects.length) {
      return subpatches.length + regularObjectIndex;
    }
    
    // If we get here, nothing is selected
    return -1;
  }, [subpatches.length, regularObjects.length]);

  // Handle selecting an object from the spatial view
  const handleSpatialObjectSelect = useCallback((objectIndex: number) => {
    if (!currentPatch) return; // Safety check
    
    // Calculate how many special entries are before the list of objects
    const specialEntryCount = (showDot ? 1 : 0) + (showDotDot ? 1 : 0);
    
    // Adjust the index to account for special entries
    const adjustedIndex = objectIndex + specialEntryCount;
    
    // Set the selected index
    setSelectedIndex(adjustedIndex);
    
    // Scroll the selected item into view
    setTimeout(() => {
      if (entryRefs.current[adjustedIndex]) {
        entryRefs.current[adjustedIndex]?.scrollIntoView({ block: "nearest" });
      }
    }, 10);
  }, [showDot, showDotDot, setSelectedIndex, entryRefs, currentPatch]);

  // Handle saving a rename
  const handleSaveRename = useCallback(
    (node: ObjectNode, name: string) => {
      if (node.subpatch && name.trim()) {
        renamePatch(node.subpatch, name.trim());
      }
    },
    [renamePatch],
  );

  // Render the component
  if (!currentPatch) {
    return <div className="p-4 text-white">No patch selected</div>;
  }

  // Calculate entry indexes for keyboard navigation
  let entryIndex = 0;

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
        <div className="breadcrumb text-base text-zinc-400 px-2 w-full py-1">
          {generateBreadcrumb(currentPatch)} {">"}{" "}
          <span className="text-white">{buffer.patch?.name || "Patch"}</span>
          {isFiltering && <span className="ml-2 text-blue-400">Filtering: {commandText}</span>}
        </div>
      </div>

      <div
        ref={entriesContainerRef}
        className="directory-entries flex-grow h-96 overflow-y-auto focus:outline-none "
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Current patch (.) - only show if not filtering or matches */}
        {showDot && (
          <>
            <DirectoryEntry
              name="."
              onClick={handleCurrentClick}
              isSpecial={true}
              index={entryIndex}
              isSelected={selectedIndex === entryIndex}
              setEntryRef={setEntryRef}
            />
            {/* Increment after using the current value */}
            <span className="hidden">{entryIndex++}</span>
          </>
        )}

        {/* Parent patch (..) if available - only show if not filtering or matches */}
        {showDotDot && (
          <>
            <DirectoryEntry
              name=".."
              onClick={handleParentClick}
              isSpecial={true}
              index={entryIndex}
              isSelected={selectedIndex === entryIndex}
              setEntryRef={setEntryRef}
            />
            {/* Increment after using the current value */}
            <span className="hidden">{entryIndex++}</span>
          </>
        )}

        {/* Subpatches first */}
        {subpatches.length > 0 && (
          <div className="subpatches-section mb-2">
            <div className="section-header text-xs text-zinc-500 px-2 pb-1">Subpatches</div>
            {subpatches.map((node) => {
              const currentIndex = entryIndex++;
              const isSelected = selectedIndex === currentIndex;
              const isEditing = editingPatchIndex === currentIndex;

              return (
                <ObjectEntry
                  key={node.id}
                  node={node}
                  isSubpatch={true}
                  index={currentIndex}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  nameInputRef={nameInputRef}
                  setEditingPatchIndex={setEditingPatchIndex}
                  setEntryRef={setEntryRef}
                  onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                    handleObjectNodeClick(node, e.metaKey)
                  }
                  rootDivRef={rootDivRef}
                  onSaveRename={handleSaveRename}
                />
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
                <ObjectEntry
                  key={node.id}
                  node={node}
                  isSubpatch={false}
                  index={currentIndex}
                  isSelected={isSelected}
                  isEditing={false}
                  editingName=""
                  setEditingName={setEditingName}
                  nameInputRef={nameInputRef}
                  setEditingPatchIndex={setEditingPatchIndex}
                  setEntryRef={setEntryRef}
                  onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                    handleObjectNodeClick(node, e.metaKey)
                  }
                  rootDivRef={rootDivRef}
                />
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {subpatches.length === 0 && regularObjects.length === 0 && (
          <div className="empty-message text-zinc-400 mt-4">No objects in this patch</div>
        )}
      </div>

      <div className="bottom-section flex flex-row mt-4">
        <div className="help-text text-xs text-zinc-500 flex-shrink-0 flex-1">
          <p>Use arrow keys ↑↓ to navigate, Enter to select</p>
          <p>Press R on a subpatch to rename it</p>
          <p>Type to filter objects by name</p>
          <p>Click or press Enter on "." to exit and open the current patch</p>
          <p>Click or press Enter on ".." to navigate up to parent</p>
          <p>Click or press Enter on a subpatch to navigate into it</p>
          <p>Click or press Enter on a regular object to open it as a buffer</p>
        </div>
        
        {/* Spatial layout visualization */}
        <div className="spatial-view-container flex-shrink-0 ml-4">
          <div className="text-xs text-zinc-500 mb-1">Spatial Layout</div>
          <SpatialLayoutView 
            objects={[...subpatches, ...regularObjects]} 
            selectedIndex={findSelectedObjectIndex(selectedIndex, showDot, showDotDot)}
            width={200} 
            height={150}
            className="rounded border border-zinc-800" 
            onSelectObject={handleSpatialObjectSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default DiredView;