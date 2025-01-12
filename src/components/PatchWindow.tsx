import { usePatches } from "@/contexts/PatchesContext";
import type Subpatch from "@/lib/nodes/Subpatch";
import type { Coordinate, Patch, SubPatch } from "@/lib/nodes/types";
import { CodeIcon, Cross2Icon, CubeIcon, GroupIcon } from "@radix-ui/react-icons";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import PatchWrapper from "./PatchWrapper";
import { useWindows } from "@/contexts/WindowsContext";
import { generateColor } from "@/utils/color";

const PatchWindow: React.FC<{ patch: Patch }> = ({ patch }) => {
  const ref = useRef<HTMLDivElement>(null);

  const { removePatchWindow, updatePosition, windowPositions } = useWindows();
  const { expandPatch, selectedPatch, setSelectedPatch } = usePatches();
  const size = (patch as Subpatch).parentNode.size;
  const width = size ? size.width : 500;
  const height = size ? size.height : 500;

  const down = useRef<Coordinate | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        down.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
      setSelectedPatch(patch);
    },
    [patch, setSelectedPatch],
  );

  useEffect(() => {
    // setSelectedPatch(patch);
  }, [patch, setSelectedPatch]);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!down.current || !ref.current) {
        return;
      }

      const x = e.clientX - down.current.x;
      const y = e.clientY - down.current.y;

      updatePosition(patch.id, { x, y });
    },
    [patch, updatePosition],
  );

  const [baseName, setBaseName] = useState("");
  useEffect(() => {
    const p = ((patch as SubPatch).parentPatch as SubPatch).parentPatch as SubPatch;

    //const p = (patch as SubPatch).parentNode.patch;
    console.log(patch);
    if (p) {
      setBaseName((p as SubPatch).name || "");
    }
  }, [patch]);

  const onMouseUp = useCallback(() => {
    down.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseUp]);

  const expand = useCallback(() => {
    patch.lockedMode = false;
    patch.presentationMode = false;
    expandPatch((patch as SubPatch).parentNode);
    removePatchWindow(patch);
    setSelectedPatch(patch);
  }, [expandPatch, removePatchWindow, patch]);

  const coord = windowPositions[patch.id] || { x: 500, y: 300 };
  return (
    <div
      style={{
        width: width + 8,
        height: Math.max(32, height) + 22,
        //left: coord.x,
        //top: coord.y,
        zIndex: selectedPatch === patch ? 100000000000000 : 1000000000,
      }}
      className={`${selectedPatch === patch ? " selected-window " : ""} rounded-xl flex-shrink-0 absolutexy relative flex flex-col patch-window bg-black select-none shadow-lg border border-zinc-600`}
      ref={ref}
    >
      <div
        onMouseDown={onMouseDown}
        className={`h-5 w-full rounded-t-xl flex ${selectedPatch === patch ? "bg-zinc-800" : "bg-zinc-950"}`}
      >
        <GroupIcon onClick={() => expand()} className="z-30 ml-3 w-3 h-3 mt-1 cursor-pointer" />
        <Cross2Icon
          onMouseDown={(e: any) => {
            e.stopPropagation();
            removePatchWindow(patch);
          }}
          className="z-30 ml-2 w-4 h-4 mt-0.5 mr-2 cursor-pointer"
        />
        <div className="z-0 absolute left-0 w-full flex">
          <div
            className={`mx-auto  text-xs py-0.5 text-zinc-${selectedPatch === patch ? 100 : 500}`}
          >
            {patch.name}
          </div>
        </div>
        <div className="absolute right-3 text-xs py-0.5 text-zinc-100">{baseName}</div>
      </div>
      <PatchWrapper
        isWindow={true}
        index={0}
        maxWidth={500}
        maxHeight={500}
        fileToOpen={null}
        tileRef={ref}
        setFileToOpen={() => 0}
        patch={patch}
      />
    </div>
  );
};

export default PatchWindow;
