import { usePatches } from "@/contexts/PatchesContext";
import type Subpatch from "@/lib/nodes/Subpatch";
import type { Coordinate, Patch, SubPatch } from "@/lib/nodes/types";
import {
  CodeIcon,
  Cross2Icon,
  CubeIcon,
  GroupIcon,
} from "@radix-ui/react-icons";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import PatchWrapper from "./PatchWrapper";

const PatchWindow: React.FC<{ patch: Patch }> = ({ patch }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [coord, setCoord] = useState({ x: 500, y: 300 });

  const { removePatchWindow, expandPatch, selectedPatch, setSelectedPatch } =
    usePatches();
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
    setSelectedPatch(patch);
  }, [patch, setSelectedPatch]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!down.current || !ref.current) {
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    setCoord({
      x: x - down.current.x,
      y: y - down.current.y,
    });
  }, []);

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

  return (
    <div
      style={{
        width: width + 8,
        height: Math.max(32, height) + 22,
        left: coord.x,
        top: coord.y,
        zIndex: selectedPatch === patch ? 100000000000000 : 1000000000,
      }}
      className="absolute flex flex-col patch-window bg-black select-none shadow-lg border border-zinc-600"
      ref={ref}
    >
      <div onMouseDown={onMouseDown} className="h-5 w-full bg-zinc-800 flex">
        <GroupIcon
          onClick={() => expand()}
          className="ml-auto w-3 h-3 mt-1 cursor-pointer"
        />
        <Cross2Icon
          onClick={() => removePatchWindow(patch)}
          className="ml-2 w-4 h-4 mt-0.5 cursor-pointer"
        />
      </div>
      <PatchWrapper
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
