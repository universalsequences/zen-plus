import { usePatch } from "@/contexts/PatchContext";
import { useMemo, useState } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { useTilesContext } from "@/contexts/TilesContext";
import { useWindows } from "@/contexts/WindowsContext";
import { usePatchMouse } from "@/hooks/usePatchMouse";
import { PatchResizeType } from "@/hooks/useTiles";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { useBuffer } from "@/contexts/BufferContext";

export const PatchResizer: React.FC<{ patch: Patch; isCustomView: boolean }> = ({
  patch,
  isCustomView,
}) => {
  const { setSelectedPatch, selectedPatch } = usePatches();
  const { gridTemplate } = useTilesContext();
  const { patchWindows } = useWindows();
  const isWindow = useMemo(() => patchWindows.includes(patch), [patch, patchWindows]);

  const { setResizingPatch, resizingPatch } = usePatchMouse({
    isCustomView,
  });

  const isResizing = resizingPatch && patch == selectedPatch;
  const [hover, setHover] = useState(false);

  return (
    <>
      <div
        onMouseOver={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          setSelectedPatch(patch);
          e.preventDefault();
          e.stopPropagation();
          setResizingPatch({
            startSize: (patch as SubPatch).parentNode?.size,
            startPosition: { x: e.pageX, y: e.pageY },
            gridTemplate,
            resizeType: PatchResizeType.South,
          });
        }}
        className={`w-full h-1 absolute ${isWindow ? "-bottom-1" : "bottom-0"} cursor-ns-resize z-30`}
      ></div>
      <div
        onMouseLeave={() => setHover(false)}
        onMouseOver={() => setHover(true)}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          setSelectedPatch(patch);
          e.preventDefault();
          e.stopPropagation();
          setResizingPatch({
            startSize: (patch as SubPatch).parentNode?.size,
            startPosition: { x: e.pageX, y: e.pageY },
            gridTemplate,
            resizeType: PatchResizeType.North,
          });
        }}
        className={`w-full h-1 absolute ${isWindow ? "-top-5" : "top-0"} cursor-ns-resize z-30`}
      ></div>
      <div
        onMouseLeave={() => setHover(false)}
        onMouseOver={() => setHover(true)}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          setSelectedPatch(patch);
          e.preventDefault();
          e.stopPropagation();
          setResizingPatch({
            startSize: (patch as SubPatch).parentNode?.size,
            startPosition: { x: e.pageX, y: e.pageY },
            gridTemplate,
            resizeType: PatchResizeType.East,
          });
        }}
        className={`h-full w-1 absolute ${isWindow ? "right-[-2px]" : "right-0"} cursor-ew-resize z-30`}
      ></div>
      {!isCustomView && (
        <div
          onMouseLeave={() => setHover(false)}
          onMouseOver={() => setHover(true)}
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
            setSelectedPatch(patch);
            e.preventDefault();
            e.stopPropagation();
            setResizingPatch({
              startSize: (patch as SubPatch).parentNode?.size,
              startPosition: { x: e.pageX, y: e.pageY },
              gridTemplate,
              resizeType: PatchResizeType.West,
            });
          }}
          className={`h-full w-1 absolute ${isWindow ? "left-[-1px]" : "left-0"} cursor-ew-resize z-30`}
        ></div>
      )}
    </>
  );
};
