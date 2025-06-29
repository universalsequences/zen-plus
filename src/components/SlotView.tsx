import React, { useState, useCallback, useEffect, useRef } from "react";
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
import type { ObjectNode, Patch, SubPatch } from "@/lib/nodes/types";
import { FileIcon, Pencil2Icon, ArrowLeftIcon, DiscIcon, UploadIcon } from "@radix-ui/react-icons";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Dialog from "@radix-ui/react-dialog";
import { usePosition } from "@/contexts/PositionContext";
import { setupSkeletonPatch } from "@/lib/utils";
import { PatchDocComponent } from "./org/PatchDocComponent";
import { useAuth } from "@/contexts/AuthContext";
import { storePatch } from "@/lib/saving/storePatch";
import { reconnectSlotsNode } from "@/lib/nodes/definitions/audio/slots";
import { recompileGraph } from "@/lib/nodes/compilation/recompileGraph";

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
  const [expandedFile, setExpandedFile] = useState<File | null>(null);
  const [showSaveView, setShowSaveView] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isFork, setIsFork] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { loadSubPatch } = useSubPatchLoader(objectNode);
  const { user } = useAuth();

  const [subpatches, setSubPatches] = useState(
    [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds),
  );

  // Initialize with all unique tags
  const [availableTags, setAvailableTags] = useState<string[]>(
    Array.from(new Set(onchainSubPatches.flatMap((p) => p.tags || []))).sort(),
  );

  useEffect(() => {
    // If we have an expanded file view, don't filter subpatches
    if (expandedFile) return;

    let _sorted = [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    // Filter by selected tags AND search text
    const filteredSubpatches = _sorted.filter((x) => {
      // First check selected tags (if any)
      const passesTagFilter =
        selectedTags.length === 0 || selectedTags.every((tag) => x.tags?.includes(tag));

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
        filteredSubpatches
          .flatMap((p) => p.tags || [])
          .filter((tag) => !selectedTags.includes(tag)),
      ),
    ).sort();
    setAvailableTags(newAvailableTags);
  }, [searchText, selectedTags, setSubPatches, onchainSubPatches, expandedFile]);

  // Expand a file to show details and editing option
  const expandFile = useCallback((file: File) => {
    setExpandedFile(file);
    // Reset search and filter state
    setSearchText("");
    setSelectedTags([]);
  }, []);

  // Go back to the list view
  const goBackToList = useCallback(() => {
    setExpandedFile(null);
  }, []);

  const [loading, setLoading] = useState(false);
  // Load the currently expanded file into the subpatch
  const loadExpandedFile = useCallback(async () => {
    if (!expandedFile) return;

    setLoading(true);
    const serializedSubPatch = await fetchSubPatchForDoc(expandedFile.id);
    if (serializedSubPatch) {
      await loadSubPatch(serializedSubPatch, expandedFile.name);
      setName(expandedFile.name);
      setExpandedFile(null); // Close expanded view after loading
      setLoading(false);
    }
  }, [expandedFile, fetchSubPatchForDoc, loadSubPatch]);

  // Directly load a file without expanding it first
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
            onClick={() => expandFile(x)}
            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer text-xs flex"
          >
            <div className="">{x.name.slice(0, 14)}</div>
            <div className="ml-auto flex">
              {/*x.moduleType && x.moduleType !== "other" && (
                <div className="text-zinc-200">{x.moduleType}</div>
              )*/}
              <div style={{ maxWidth: 150 }} className="ml-3 flex">
                {x.tags?.map((tag) => (
                  <span key={tag} className="underline mx-1">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="w-20 text-right ml-1 text-zinc-500">
                {getTime(x.createdAt.toDate())}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [subpatches, expandFile]);

  // Auto-expand if the current file is already loaded in the subpatch
  // But only when the menu is first opened
  /*
  useEffect(() => {
    if (isMenuOpen && !expandedFile) {
      // Check if the subpatch has a docId and try to find the matching file
      const currentDocId = objectNode.subpatch?.docId;
      if (currentDocId) {
        const currentFile = onchainSubPatches.find((file) => file.id === currentDocId);
        if (currentFile) {
          setExpandedFile(currentFile);
        }
      }
    }
  }, [isMenuOpen, objectNode.subpatch?.docId, onchainSubPatches, expandedFile]);
  */

  return (
    <Tooltip.Provider delayDuration={300}>
      <ContextMenu.Root onOpenChange={setIsMenuOpen}>
        <ContextMenu.Content
          onMouseDown={(e: any) => e.stopPropagation()}
          style={{ zIndex: 10000000000000 }}
          color="indigo"
          className="object-context rounded-lg p-2 text-xsflex flex-col overflow-hidden text-sm w-96"
        >
          <div className="text-zinc-300 pb-2 flex flex-col">
            <SearchBox
              searchText={searchText}
              setSearchText={(value) => {
                setSearchText(value);
                // Exit expanded view if user starts typing
                if (expandedFile && value !== "") {
                  setExpandedFile(null);
                }
              }}
            />
          </div>

          {!expandedFile && (
            <div
              style={{ maxHeight: "60px" }}
              className="flex flex-wrap gap-2 mb-2 px-1 overflow-y-scroll"
            >
              {/* Selected tags */}
              {selectedTags.map((tag) => (
                <div
                  key={tag}
                  onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                  className="px-2 py-0.5 text-xs rounded-md cursor-pointer border border-zinc-600 bg-zinc-700 text-white flex items-center"
                >
                  <span>{tag}</span>
                  <span className="ml-1 font-bold">×</span>
                </div>
              ))}

              {availableTags.map((tag) => (
                <div
                  key={tag}
                  onClick={() => setSelectedTags([...selectedTags, tag])}
                  className="px-2 py-0.5 text-xs rounded-md cursor-pointer border border-zinc-600 hover:bg-zinc-700 text-zinc-300"
                >
                  {tag}
                </div>
              ))}
            </div>
          )}

          <div className="flex mb-2">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <FileIcon
                  onClick={() => {
                    const subpatch = objectNode.subpatch as SubPatch;
                    subpatch.clearPatch();
                    setupSkeletonPatch(subpatch, 2);
                    recompileGraph(subpatch);
                    setTimeout(() => {
                      if (subpatch.slotsNode) reconnectSlotsNode(subpatch.slotsNode);
                    }, 500);
                    setName("zen");
                  }}
                  className="w-4 h-4 ml-auto cursor-pointer"
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="bg-white px-2 py-1 text-black text-xs rounded-lg shadow-md"
                  style={{ zIndex: 10000000000001 }}
                  sideOffset={5}
                >
                  Clear patch and add empty skeleton
                  <Tooltip.Arrow className="fill-white" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Pencil2Icon
                  onClick={() => {
                    const subpatch = objectNode.patch as SubPatch;
                    subpatch.presentationMode = false;
                    subpatch.lockedMode = false;
                    expandPatch(objectNode);
                  }}
                  className="w-4 h-4 ml-4 cursor-pointer"
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="bg-white px-2 py-1 text-black text-xs rounded-lg shadow-md"
                  style={{ zIndex: 10000000000001 }}
                  sideOffset={5}
                >
                  Edit subpatch
                  <Tooltip.Arrow className="fill-white" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <UploadIcon
                  onClick={() => {
                    setSaveName(objectNode.subpatch?.name || name);
                    setShowSaveView(true);
                    setExpandedFile(null);
                  }}
                  className="w-4 h-4 ml-4 cursor-pointer"
                />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  className="bg-white px-2 py-1 text-black text-xs rounded-lg shadow-md"
                  style={{ zIndex: 10000000000001 }}
                  sideOffset={5}
                >
                  Save subpatch
                  <Tooltip.Arrow className="fill-white" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>

          {showSaveView ? (
            <div className="flex flex-col text-xs">
              {/* Back button and header for save view */}
              <div className="flex items-center mb-3">
                <ArrowLeftIcon
                  onClick={() => setShowSaveView(false)}
                  className="w-4 h-4 cursor-pointer mr-2"
                />
                <div className="text-sm font-medium">Save Subpatch</div>
              </div>

              {/* Current patch info if available */}
              {objectNode.subpatch?.docId && (
                <div className="text-xs text-zinc-400 mb-4">
                  Currently loaded:{" "}
                  <span className="text-zinc-200">{objectNode.subpatch.name}</span>
                  {objectNode.subpatch.docId && (
                    <span className="ml-2">
                      (ID: {objectNode.subpatch.docId.substring(0, 6)}...)
                    </span>
                  )}
                </div>
              )}

              {/* Save form */}
              <div className="mb-4">
                <label className="block text-xs mb-1">Patch Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md outline-none text-xs"
                  placeholder="Enter name to save"
                />
              </div>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="fork-option"
                  checked={isFork}
                  onChange={(e) => setIsFork(e.target.checked)}
                  className="h-3 w-3 rounded border-zinc-600 mr-2"
                />
                <label htmlFor="fork-option" className="text-xs">
                  Save as fork (create a new copy)
                </label>
              </div>

              <button
                onClick={async () => {
                  if (!saveName.trim()) return;
                  if (!objectNode.subpatch) return;
                  if (!user?.email) return;

                  setIsSaving(true);
                  try {
                    await storePatch(
                      saveName,
                      objectNode.subpatch,
                      true, // isSubPatch
                      user.email,
                      undefined, // screenshot
                      isFork,
                    );

                    // Update the name in the UI
                    setName(saveName);

                    // Close the save view
                    setShowSaveView(false);
                  } catch (error) {
                    console.error("Failed to save subpatch:", error);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving || !saveName.trim()}
                className={`flex-1 px-3 py-2 text-xs rounded-md ${
                  isSaving || !saveName.trim()
                    ? "bg-zinc-100 opacity-50 cursor-not-allowed"
                    : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {isSaving ? "Saving..." : "Save Subpatch"}
              </button>
            </div>
          ) : expandedFile ? (
            <div className="flex flex-col text-xs">
              {/* Back button and header for expanded view */}
              <div className="flex items-center mb-3">
                <ArrowLeftIcon onClick={goBackToList} className="w-4 h-4 cursor-pointer mr-2" />
                <div className="text-sm font-medium">{expandedFile.name}</div>
                <button
                  onClick={loadExpandedFile}
                  className="ml-auto px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                >
                  {loading ? "Loading... " : "Load"}
                </button>
              </div>

              {/* PatchDoc component for editing tags */}
              <PatchDocComponent
                hidePublic={true}
                isFlexRow={true}
                docId={expandedFile.id}
                doc={expandedFile}
              />
            </div>
          ) : (
            patchMemo
          )}
        </ContextMenu.Content>
        <ContextMenu.Trigger
          className={
            "w-full flex h-full slot-view overflow-hidden " +
            objectNode.attributes.moduleType +
            (patchWindows.includes(objectNode.subpatch as Patch) ||
            patches.includes(objectNode.subpatch as Patch)
              ? " "
              : "") +
            (isMenuOpen ? " bg-white text-black" : "")
          }
        >
          <div>
            <div
              className={`mr-2 ml-auto my-auto flex ${isMenuOpen ? "text-black" : [...patches, ...patchWindows].includes(objectNode.subpatch as SubPatch) ? "text-zinc-200" : "text-zinc-400"}`}
            >
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
                  (objectNode.subpatch &&
                  [...patches, ...patchWindows].includes(objectNode.subpatch)
                    ? " bg-zinc-400 hover:bg-zinc-200 "
                    : " hover:bg-zinc-700 ") +
                  "w-3 h-3 my-auto rounded-full border border-1 border-zinc-600 ml-2 transition-colors cursor-pointer"
                }
              />
            </div>
          </div>
        </ContextMenu.Trigger>
      </ContextMenu.Root>
    </Tooltip.Provider>
  );
};

export default SlotView;
