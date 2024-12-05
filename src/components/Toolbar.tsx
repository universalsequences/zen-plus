import React, { memo, useRef, useEffect, useCallback, useState } from "react";
import { RecorderToolbar } from "./RecorderToolbar";
import LockButton from "./LockButton";
import PresentationMode from "./PresentationMode";
import OrgSpaces from "./org/OrgSpaces";
import PatchDropdown from "./PatchDropdown";
import { GlobeIcon, CaretRightIcon, Cross2Icon } from "@radix-ui/react-icons";
import { usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";
import type { Node, Patch, SubPatch } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";
import { SelectedNodeInfo } from "./SelectedNodeInfo";

enum Option {
  Save,
  Load,
}
const Toolbar: React.FC<{ patch: Patch }> = ({ patch }) => {
  // for now this will simply tell us what nested subpatches are
  const [option, setOption] = useState<Option | null>(null);
  const { selectedNodes } = useSelection();

  const {
    patchDragging,
    setPatchDragging,
    changeTileForPatch,
    zenCode,
    selectedPatch,
    closePatch,
    patches,
    setPatches,
  } = usePatches();
  const { assist } = usePatch();
  let breadcrumbs: any[] = [];
  let _patch: Patch = patch;
  let [editing, setEditing] = useState(false);
  let [patchName, setPatchName] = useState(patch.name || "");

  let key = 0;

  useEffect(() => {
    window.addEventListener("click", stopEdit);
    return () => window.removeEventListener("click", stopEdit);
  }, [setEditing]);

  const stopEdit = useCallback(
    (e: any) => {
      setEditing(false);
    },
    [setEditing],
  );

  const onChange = useCallback(
    (e: any) => {
      setPatchName(e.target.value);
      patchRef.current.name = e.target.value;
    },
    [setPatchName, patch],
  );

  const patchRef = useRef<Patch>(patch);

  const isSelected = patch === selectedPatch;

  useEffect(() => {
    patchRef.current = patch;
  }, [patch]);
  breadcrumbs.push(
    <div
      draggable={true}
      key={key}
      onClick={(e: any) => {
        e.stopPropagation();
        if (!editing) {
          setEditing(true);
        }
      }}
      className="text-white my-auto text-xs rounded-full cursor-pointer"
    >
      {editing ? (
        <input
          onKeyDown={(e: any) => (e.key === "Enter" ? setEditing(false) : 0)}
          style={{ borderBottom: "1px solid #4f4f4f" }}
          value={patchName}
          onChange={onChange}
          className="text-white bg-black-clear outline-none px-1"
        />
      ) : (
        patch.name || "current patch"
      )}
    </div>,
  );

  const selectPatch = useCallback(
    (_patch: Patch) => {
      changeTileForPatch(patchRef.current, _patch);
    },
    [setPatches, patches, patch],
  );

  while ((_patch as SubPatch).parentPatch) {
    key++;
    _patch = (_patch as SubPatch).parentPatch;
    let p = _patch;
    let __patch = _patch;
    breadcrumbs.push(
      <div
        draggable="true"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDragStart={(e) => {
          setPatchDragging(p);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => {
          if (!patchDragging) {
            selectPatch(p);
          }
        }}
        key={key}
        className=" my-auto text-zinc-400 cursor-pointer text-xs rounded-full flex"
      >
        {(_patch as SubPatch).parentPatch === undefined ? "base" : _patch.name || "patch"}
        <CaretRightIcon className="w-2 mx-1" />
      </div>,
    );
  }

  breadcrumbs.reverse();

  const _closePatch = useCallback(() => {
    let _p = patches.filter((x) => x !== patch);
    if (_p.length === 0) {
      _p = [(patch as SubPatch).parentPatch];
    }
    setPatches(_p);
  }, [patches, setPatches, patch]);

  let [showAssist, setShowAssist] = useState(false);
  let [assistText, setAssistText] = useState("");
  let [loading, setLoading] = useState(false);
  let ___patch = patch;

  while (___patch && !(___patch as SubPatch).isZenBase() && (___patch as SubPatch).parentPatch) {
    ___patch = (___patch as SubPatch).parentPatch;
  }

  let basePatch = patch;
  while (basePatch && (basePatch as SubPatch).parentPatch) {
    basePatch = (basePatch as SubPatch).parentPatch;
  }

  const rightPart =
    selectedNodes && selectedNodes[0] ? (
      <SelectedNodeInfo node={selectedNodes[0]} />
    ) : (
      <div className="flex ml-3">
        <LockButton />
        <PresentationMode />
        {basePatch && <RecorderToolbar patch={basePatch} />}
      </div>
    );
  if (breadcrumbs.length === 1) {
    return (
      <div style={{ zIndex: 10000000 }} className="flex  full w-full select-none ">
        <div
          className={`${isSelected ? "selected-toolbar" : ""} flex-1 bg-toolbar relative flex pl-2  top-toolbar h-full `}
        >
          <PatchDropdown patch={patch}>
            <GlobeIcon className="w-4 h-4 my-auto mr-3 cursor-pointer" />
          </PatchDropdown>
          <div
            style={{ minWidth: "100px" }}
            className="ml-auto flex top-0 bottom my-auto right-0 pl-3 flex h-full bg-zinc-800"
          >
            {rightPart}
          </div>
        </div>
      </div>
    );
  }

  let type = (patch as SubPatch).parentNode.attributes.type;

  let __patch = patch;
  if (type === "zen") {
    __patch = ___patch;
  }
  return (
    <div
      onClick={(e: any) => e.stopPropagation()}
      onMouseDown={(e: any) => e.stopPropagation()}
      className="flex  full w-full select-none "
      style={{ zIndex: 10000000 }}
    >
      <div
        className={`${isSelected ? "selected-toolbar" : ""} flex-1 bg-toolbar relative flex pl-2  top-toolbar h-full `}
      >
        <PatchDropdown patch={patch}>
          <GlobeIcon className="w-4 h-4 my-auto mr-3 cursor-pointer" />
        </PatchDropdown>
        <div className="flex relative pr-8 my-auto">
          {breadcrumbs}
          <Cross2Icon
            onClick={() => {
              closePatch(patch);
            }}
            className="w-3 h-3 absolute top-0 bottom-0 my-auto right-2 cursor-pointer"
          />
        </div>
        {
          <div className="absolute right-28 bottom-0 top-0  mr-3 my-auto  right-0 px-5 flex  flex w-36 text-right">
            <div className="text-xs my-auto ml-auto text-zinc-400">
              {__patch.zenCode
                ? `compiled (${(__patch as SubPatch).parentNode.attributes["target"]})`
                : type}
            </div>
            <div
              className={`w-2 h-2 rounded-full ${type === "audio" ? "bg-yellow-300" : type === "gl" ? "bg-purple-500" : "bg-teal-200"} my-auto ml-2`}
            ></div>
          </div>
        }
        <div
          style={{ minWidth: "80px" }}
          className="ml-auto flex top-0 bottom my-auto  right-0 flex w-32 flex h-full bg-zinc-800"
        >
          <div className="flex w-full">{rightPart}</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
