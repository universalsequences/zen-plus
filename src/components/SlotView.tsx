import React, { useState, useCallback, useEffect } from "react";
import { getTime } from "@/components/ProjectOption";
import { useWindows } from "@/contexts/WindowsContext";
import type { File } from "@/lib/files/types";
import {
  OperatorContext,
  OperatorContextType,
  getAllContexts,
  getOperatorContext,
} from "@/lib/nodes/context";
import { useSubPatchLoader } from "@/hooks/useSubPatchLoader";
import { OnchainSubPatch } from "@/lib/onchain/fetch";
import SearchBox from "./SearchBox";
import { ContextMenu } from "@radix-ui/themes";
import { useStorage } from "@/contexts/StorageContext";
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import type { ObjectNode, SubPatch } from "@/lib/nodes/types";
import { duplicateObject } from "@/lib/nodes/utils/duplicateObject";
import { FileIcon, Pencil2Icon, CardStackPlusIcon } from "@radix-ui/react-icons";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { usePosition } from "@/contexts/PositionContext";
import { setupSkeletonPatch } from "@/lib/utils";

export const SLOT_VIEW_WIDTH = 180;
export const SLOT_VIEW_HEIGHT = 20;

const SlotView: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const _name =
    objectNode.subpatch && objectNode.subpatch.name ? objectNode.subpatch.name : objectNode.text;
  const { removePatchWindow, patchWindows, addPatchWindow } = useWindows();

  const { closePatch, expandPatch, patches } = usePatches();
  const { registerConnection, newObjectNode } = usePatch();
  const { fetchSubPatchForDoc, onchainSubPatches } = useStorage();
  const { updatePosition } = usePosition();

  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [name, setName] = useState(_name);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { loadSubPatch } = useSubPatchLoader(objectNode);

  const [subpatches, setSubPatches] = useState(
    [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds),
  );
  
  // Initialize with all unique tags
  const [availableTags, setAvailableTags] = useState<string[]>(
    Array.from(new Set(onchainSubPatches.flatMap(p => p.tags || []))).sort()
  );

  useEffect(() => {
    let _sorted = [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    
    // Filter by selected tags AND search text
    const filteredSubpatches = _sorted.filter((x) => {
      // First check selected tags (if any)
      const passesTagFilter = selectedTags.length === 0 || 
        selectedTags.every(tag => x.tags?.includes(tag));
      
      // Then check search text
      const passesSearchFilter = 
        searchText === "" ||
        x.tags?.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase())) ||
        (x.moduleType && x.moduleType.toLowerCase().includes(searchText.toLowerCase())) ||
        x.name.toLowerCase().includes(searchText.toLowerCase());
        
      return passesTagFilter && passesSearchFilter;
    });
    
    setSubPatches(filteredSubpatches);
    
    // Update available tags based on current filtered results
    const newAvailableTags = Array.from(
      new Set(
        filteredSubpatches.flatMap(p => p.tags || [])
          .filter(tag => !selectedTags.includes(tag))
      )
    ).sort();
    setAvailableTags(newAvailableTags);
    
  }, [searchText, selectedTags, setSubPatches, onchainSubPatches]);

  const load = useCallback(
    async (x: File) => {
      const serializedSubPatch = await fetchSubPatchForDoc(x.id);
      if (serializedSubPatch) {
        await loadSubPatch(serializedSubPatch, x.name);
        setName(x.name);
      }
    },
    [fetchSubPatchForDoc, loadSubPatch],
  );

  const patchMemo = React.useMemo(() => {
    return (
      <div className="h-64 overflow-scroll">
        {subpatches.map((x) => (
          <div
            key={x.id}
            onClick={() => load(x)}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer text-xs flex"
          >
            <div className="">{x.name.slice(0, 20)}</div>
            <div className="ml-auto flex">
              {x.moduleType && x.moduleType !== "other" && (
                <div className="text-zinc-200">{x.moduleType}</div>
              )}
              <div className="ml-3 flex">
                {x.tags?.map((x) => (
                  <span key={x} className="underline mx-1">
                    {x}
                  </span>
                ))}
              </div>
              <div className="w-20  text-right ml-1 text-zinc-500">
                {getTime(x.createdAt.toDate())}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [subpatches, load]);

  // Add global style for open state
  // Remove previous style injection approach

  return (
    <ContextMenu.Root onOpenChange={setIsMenuOpen}>
      <ContextMenu.Content
        onMouseDown={(e: any) => e.stopPropagation()}
        style={{ zIndex: 10000000000000 }}
        color="indigo"
        className="object-context rounded-lg p-2 text-xsflex flex-col overflow-hidden text-sm w-96"
      >
        <div className="text-zinc-300 pb-2 flex flex-col">
          <SearchBox searchText={searchText} setSearchText={setSearchText} />
        </div>
        {/* Tag explorer */}
        <div className="flex flex-wrap gap-2 mb-2 px-1">
          {/* Selected tags */}
          {selectedTags.map(tag => (
            <div 
              key={tag}
              onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
              className="px-2 py-0.5 text-xs rounded-md cursor-pointer border border-zinc-600 bg-zinc-700 text-white flex items-center"
            >
              <span>{tag}</span>
              <span className="ml-1 font-bold">×</span>
            </div>
          ))}
          
          {/* Available tags */}
          {availableTags.map(tag => (
            <div 
              key={tag}
              onClick={() => setSelectedTags([...selectedTags, tag])}
              className="px-2 py-0.5 text-xs rounded-md cursor-pointer border border-zinc-600 hover:bg-zinc-700 text-zinc-300"
            >
              {tag}
            </div>
          ))}
        </div>
        <div className="flex mb-2">
          <FileIcon
            onClick={() => {
              const subpatch = objectNode.subpatch as SubPatch;
              subpatch.clearPatch();
              setupSkeletonPatch(subpatch, 2);
              subpatch.recompileGraph();
              setName("zen");
            }}
            className="w-4 h-4 ml-auto cursor-pointer"
          />
          <Pencil2Icon
            onClick={() => {
              const subpatch = objectNode.patch as SubPatch;
              subpatch.presentationMode = false;
              subpatch.lockedMode = false;
              expandPatch(objectNode);
            }}
            className="w-4 h-4 ml-4 cursor-pointer"
          />
          <CardStackPlusIcon
            onClick={() => {
              duplicateObject({ objectNode, newObjectNode, updatePosition });
            }}
            className="w-4 h-4 ml-4 mr-3 cursor-pointer"
          />
        </div>
        {patchMemo}
      </ContextMenu.Content>
      <ContextMenu.Trigger
        className={
          "w-full flex h-full slot-view overflow-hidden " + 
          objectNode.attributes.moduleType + 
          (patchWindows.includes(objectNode.subpatch) || patches.includes(objectNode.subpatch) 
            ? " border border-white" 
            : "") +
          (isMenuOpen ? " bg-white text-black" : "")
        }
      >
        <div>
          <div className={`mr-2 ml-auto my-auto flex ${isMenuOpen ? 'text-black' : 'text-zinc-300'}`}>
            <div>{name}</div>
            <div
              onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
              }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                if (objectNode.subpatch) {
                  if (e.metaKey) {
                    if (patches.includes(objectNode.subpatch)) {
                      closePatch(objectNode.subpatch);
                    } else {
                      expandPatch(objectNode);
                    }
                    return;
                  }
                  if (patchWindows.includes(objectNode.subpatch)) {
                    removePatchWindow(objectNode.subpatch);
                    return;
                  }
                  if (patches.includes(objectNode.subpatch)) {
                    closePatch(objectNode.subpatch);
                    return;
                  }
                  if (objectNode.attributes["Custom Presentation"]) {
                    objectNode.subpatch.presentationMode = true;
                    objectNode.subpatch.lockedMode = true;
                    objectNode.subpatch.justExpanded = true;
                    addPatchWindow(objectNode.subpatch);
                  } else {
                    objectNode.subpatch.presentationMode = false;
                    objectNode.subpatch.lockedMode = false;
                    objectNode.subpatch.justExpanded = true;
                    expandPatch(objectNode);
                  }
                }
              }}
              className={
                (objectNode.subpatch && [...patches, ...patchWindows].includes(objectNode.subpatch)
                  ? " bg-zinc-400 hover:bg-zinc-200 "
                  : " hover:bg-zinc-700 ") +
                "w-3 h-3 my-auto rounded-full border border-1 border-zinc-600 ml-2 transition-colors cursor-pointer"
              }
            />
          </div>
        </div>
      </ContextMenu.Trigger>
    </ContextMenu.Root>
  );
};

export default SlotView;
