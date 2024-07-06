import React from "react";
import { usePatch } from "@/contexts/PatchContext";
import { usePatches } from "@/contexts/PatchesContext";

export const MiniToolbar = () => {
  const { patch } = usePatch();
  const { selectedPatch } = usePatches();

  const isSelected = patch === selectedPatch;
  const name = patch.name || "base patch";
  return (
    <div
      style={{ zIndex: 10000000000 }}
      className={`${isSelected ? "text-zinc-300 bg-zinc-800" : "text-zinc-600 bg-zinc-950"} absolute bottom-0 left-0 py-1 pr-10 px-2 text-xs rounded-ne-xl`}
    >
      {name}
    </div>
  );
};
