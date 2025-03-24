import { usePatches } from "@/contexts/PatchesContext";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { BufferType, type Buffer } from "@/lib/tiling/types";
import { useCallback } from "react";

export const BufferToolbar: React.FC<{ buffer: Buffer }> = ({ buffer }) => {
  const {
    patchDragging,
    setPatchDragging,
    changeTileForPatch,
    selectedBuffer,
    zenCode,
    selectedPatch,
    closePatch,
    patches,
    setPatches,
    patchNames,
    setPatchNames,
  } = usePatches();

  const isSelected = buffer === selectedBuffer;

  const name =
    buffer.type === BufferType.BufferList
      ? "*buffer-list*"
      : buffer.type === BufferType.Dired
        ? "*dired*"
        : buffer.type === BufferType.Object
          ? buffer.objectNode?.name
          : "";

  // Function to generate breadcrumb path
  const generateBreadcrumb = useCallback((currentPatch: Patch) => {
    if (!currentPatch) return "";

    let path = "";
    let current: Patch | null = currentPatch;
    const parts: string[] = [];

    // Build path from current patch up through parents
    while (current) {
      const name = current.name || (!(current as SubPatch).parentPatch ? "Root Patch" : "Untitled");

      parts.unshift(name);

      // Move to parent if exists
      current = (current as SubPatch).parentPatch || null;
    }

    // Join with separator
    return parts.join(" > ");
  }, []);

  return (
    <div
      style={{ backgroundColor: isSelected ? "#0032ffb8" : "" }}
      className={`px-2 text-xs h-8 w-full flex ${isSelected ? "" : "bg-zinc-800"}`}
    >
      <div className="my-auto mr-2">{name}</div>
      <div className="my-auto text-zinc-400">
        {buffer.objectNode ? generateBreadcrumb(buffer.objectNode.patch.parentPatch) + " > " : ""}
      </div>
      <div className="my-auto text-zinc-100 ml-1">
        {buffer.objectNode ? buffer.objectNode.patch.name : ""}
      </div>
    </div>
  );
};
