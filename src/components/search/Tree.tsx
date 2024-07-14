import React, { useEffect, useCallback, useRef, useState } from "react";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import {
  FilesQueryResult,
  Project,
  useStorage,
} from "@/contexts/StorageContext";
import Files from "@/components/files/Files";
import TreePath from "./TreePath";
import { File } from "@/lib/files/types";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  GlobeIcon,
  CaretRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { BoxModelIcon, CubeIcon } from "@radix-ui/react-icons";
import { SubPatch, Patch } from "@/lib/nodes/types";
import SubPatchImpl from "@/lib/nodes/Subpatch";
import { usePatches } from "@/contexts/PatchesContext";
import { Slot } from "@/lib/nodes/definitions/audio/slots";

interface HasSlots {
  slots: Slot[];
}

type PatchOrSlots =
  | Patch
  | {
      slots: Slot[];
      name?: string;
    };

const Tree: React.FC<{
  setDragging: (x: Patch | null) => void;
  dragging: Patch | null;
  patchOpened: Patch | null;
  patch: PatchOrSlots;
  cursor: number;
  searchTerm: string;
  hide: () => void;
  idx: number;
}> = ({
  searchTerm,
  patch,
  hide,
  idx,
  cursor,
  patchOpened,
  dragging,
  setDragging,
}) => {
  let { patches, expandPatch, selectedPatch, setSelectedPatch } = usePatches();

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cursor, idx, searchTerm]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && cursor === idx) {
        if (
          searchTerm !== "" &&
          (!patch.name ||
            !patch.name.toLowerCase().includes(searchTerm.toLowerCase()))
        ) {
          return;
        }
        patch.justExpanded = true;
        expandPatch((patch as SubPatch).parentNode);
        hide();
      }
    },
    [cursor, searchTerm, idx],
  );

  let counter = idx;
  let trees = [];
  const nodes = (patch as Patch).objectNodes || (patch as HasSlots).slots;
  for (const node of nodes) {
    if (node.subpatch || node.slots) {
      let _counter = counter;
      if (
        searchTerm === "" ||
        node.subpatch?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        _counter++;
      }

      trees.push(
        <Tree
          dragging={dragging}
          setDragging={setDragging}
          patchOpened={patchOpened}
          key={node.id}
          searchTerm={searchTerm}
          patch={node.slots ? (node as HasSlots) : (node.subpatch as SubPatch)}
          hide={hide}
          idx={_counter}
          cursor={cursor}
        />,
      );
      let innerPatches =
        node.subpatch
          ?.getAllNodes()
          .filter(
            (x) =>
              x.subpatch &&
              (searchTerm === "" ||
                (x.subpatch.name &&
                  x.subpatch
                    .name!.toLowerCase()
                    .includes(searchTerm.toLowerCase()))),
          ) || [];
      if (searchTerm !== "") {
        if (
          node.subpatch?.name &&
          node.subpatch?.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          counter += innerPatches.length + 1;
        } else {
          counter += innerPatches.length + 0;
        }
      } else {
        counter += innerPatches.length + 1;
      }
    }
  }
  let isPresenting =
    patch.presentationMode ||
    ((patch as SubPatch).parentNode &&
      (patch as SubPatch).parentNode.attributes["Custom Presentation"]);
  let type =
    (patch as SubPatch).parentNode &&
    (patch as SubPatch).parentNode.attributes.type;

  const onDrop = useCallback(() => {
    if (patch === dragging) {
      return;
    }
    console.log("DROP!", dragging, patch);
    let sub = dragging as SubPatch;
    if (sub.parentPatch) {
      let node = sub.parentNode;
      sub.parentPatch.objectNodes = sub.parentPatch.objectNodes.filter(
        (x) => x !== node,
      );
      sub.parentPatch = patch;
      node.patch = patch;
      patch.objectNodes.push(node);
      expandPatch(node);
    }
  }, [dragging, patch]);

  const [draggingOver, setDraggingOver] = useState(false);

  return (
    <div>
      {(searchTerm === "" ||
        (patch.name &&
          patch.name.toLowerCase().includes(searchTerm.toLowerCase()))) && (
        <div
          onKeyUp={(e) => 0}
          onClick={(e: any) => {
            e.stopPropagation();

            if (!(patch as SubPatch).parentNode) {
              return;
            }
            if (patchOpened && selectedPatch) {
              (patch as SubPatch).parentPatch = selectedPatch;
              (patch as SubPatch).parentNode.patch = selectedPatch;
              let node = (patch as SubPatch).parentNode;
              selectedPatch.objectNodes.push(node);

              // clear all outlets and inlets
              for (let inlet of node.inlets) {
                inlet.connections = [];
              }
              for (let outlet of node.outlets) {
                outlet.connections = [];
              }

              patch.initialLoadCompile();
              patch.id = "10232123";
              let _selectedPatch = selectedPatch;
              expandPatch((patch as SubPatch).parentNode);
              setSelectedPatch(selectedPatch);
            } else {
              expandPatch((patch as SubPatch).parentNode);
            }
            // hide();
          }}
          draggable="true"
          onDragStart={() => setDragging(patch)}
          onDragOver={(e: any) => {
            e.preventDefault();
            setDraggingOver(true);
          }}
          onDragLeave={(e: any) => {
            e.preventDefault();
            setDraggingOver(false);
          }}
          onDrop={onDrop}
          style={
            cursor === idx
              ? {
                  backgroundColor: "#b6dcd42f",
                }
              : {}
          }
          className={
            (patches.includes(patch)
              ? " bg-black-clear2 border border-zinc-600 "
              : "") +
            (draggingOver ? "bg-zinc-400 " : "") +
            (cursor === idx ? "   " : "") +
            " pl-3  my-1 cursor-pointer flex py-1 overflow-hidden whitespace-nowrap " +
            (!patch.name ? " text-zinc-300" : "")
          }
        >
          <div
            className={
              (isPresenting ? "" : "text-zinc-300") +
              " mr-5 flex hover:text-white transition-colors hover:underline active:scale-105 transition-all"
            }
          >
            {" "}
            {!(patch as SubPatch).parentPatch ? (
              <GlobeIcon className="mr-2 w-3 my-auto" />
            ) : isPresenting ? (
              <BoxModelIcon className="mr-2 w-3 my-auto" />
            ) : (
              <CubeIcon className="mr-2 w-3 my-auto" />
            )}{" "}
            {patch.name ||
              ((patch as SubPatch).parentPatch ? "subpatch" : "base patch")}
            <div
              className={`w-1 h-1 rounded-full ${type === "audio" ? "bg-yellow-300" : type === "gl" ? "bg-purple-500" : "bg-teal-200"} my-auto ml-2`}
            />
          </div>
          {<TreePath patch={patch as SubPatch} />}
        </div>
      )}
      {dragging !== patch && (
        <div className={searchTerm === "" ? "ml-2" : ""}>{trees}</div>
      )}
    </div>
  );
};

export default Tree;
