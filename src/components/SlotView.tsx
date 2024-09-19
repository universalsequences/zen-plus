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
import { duplicate } from "@/lib/nodes/utils/duplicateObject";
import { FileIcon, Pencil2Icon, CardStackPlusIcon } from "@radix-ui/react-icons";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { usePosition } from "@/contexts/PositionContext";

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
  const [name, setName] = useState(_name);
  const { loadSubPatch } = useSubPatchLoader(objectNode);

  const [subpatches, setSubPatches] = useState(
    [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds),
  );

  useEffect(() => {
    let _sorted = [...onchainSubPatches].sort((a, b) =>
      b.createdAt.seconds - a.createdAt.seconds
    );
    setSubPatches(
      _sorted.filter(
        (x) =>
          searchText === "" ||
          x.tags?.some((x) => x.toLowerCase().includes(searchText.toLowerCase())) ||
          (x.moduleType && x.moduleType.includes(searchText.toLowerCase())) ||
          x.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    );
  }, [searchText, setSubPatches, onchainSubPatches]);

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
                  <span className="underline mx-1">{x}</span>
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

  return (
    <ContextMenu.Root>
      <ContextMenu.Content
        onMouseDown={(e: any) => e.stopPropagation()}
        style={{ zIndex: 10000000000000 }}
        color="indigo"
        className="object-context rounded-lg p-2 text-xsflex flex-col overflow-hidden text-sm w-96"
      >
        <div className="text-zinc-300 pb-2  flex flex-col">
          <SearchBox searchText={searchText} setSearchText={setSearchText} />
        </div>
        <div className="flex mb-2">
          <FileIcon
            onClick={() => {
              const subpatch = objectNode.subpatch as SubPatch;
              subpatch.clearPatch();
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
              duplicate({ objectNode, newObjectNode, updatePosition });
            }}
            className="w-4 h-4 ml-4 mr-3 cursor-pointer"
          />
        </div>
        {patchMemo}
      </ContextMenu.Content>
      <ContextMenu.Trigger
        className={
          "w-full flex h-full slot-view overflow-hidden " + objectNode.attributes.moduleType
        }
      >
        <div>
          <div className="mr-2 ml-auto my-auto text-zinc-300 flex">
            <div>{name}</div>
            <div
              onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
              }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                if (objectNode.subpatch) {
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
