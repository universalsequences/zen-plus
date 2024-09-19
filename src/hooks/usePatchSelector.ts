import { useCallback } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import { Patch, SubPatch } from "@/lib/nodes/types";

export const usePatchSelector = () => {
  const { patch } = usePatch();
  const { patches, setSelectedPatch } = usePatches();
  const selectPatch = useCallback(() => {
    let p: Patch = patch;
    while (p && !patches.includes(p)) {
      p = (p as SubPatch).parentPatch as Patch;
    }
    if (p) {
      setSelectedPatch(p);
    }
  }, [patch, patches, setSelectedPatch]);

  return { selectPatch };
};
