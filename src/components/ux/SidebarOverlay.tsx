import React, { useCallback, useMemo } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { ObjectNode } from "@/lib/nodes/types";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { getRootPatch } from "@/lib/nodes/traverse";
import { useSelection } from "@/contexts/SelectionContext";

const SidebarOverlay: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { lockedMode } = useLocked();
  const { currentSidebarObject, isMinimized } = useSidebar();
  useSelection();

  // Check if this sidebarOverlay object's target is currently showing in the sidebar
  const isSelected = useMemo(() => {
    // If disabled attribute is true, always show as unselected
    if (objectNode.attributes.disabled) return false;

    if (!currentSidebarObject || isMinimized) return false;

    const objectName = objectNode.attributes.object as string;
    if (!objectName) return false;

    // Check if the current sidebar object matches the scripting name we're targeting
    const patch = objectNode.patch;
    const rootPatch = getRootPatch(patch.getZenBase() || patch);
    const targetObjects = rootPatch.scriptingNameToNodes[objectName];

    return targetObjects && targetObjects.includes(currentSidebarObject);
  }, [currentSidebarObject, isMinimized, objectNode, objectNode.attributes.disabled]);

  const handleClick = useCallback(() => {
    if (!lockedMode) return;

    if (isSelected) {
      // Hide the sidebar
      objectNode.receive(objectNode.inlets[0], 0);
    } else {
      // Show the sidebar
      objectNode.receive(objectNode.inlets[0], 1);
    }
  }, [lockedMode, objectNode, isSelected]);

  return (
    <button
      onClick={lockedMode ? handleClick : undefined}
      className={`
        w-full h-full flex items-center justify-center rounded transition-all duration-150
        ${
          isSelected
            ? "bg-zinc-500 hover:bg-zinc-400 text-white"
            : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
        }
      `}
      style={{
        pointerEvents: lockedMode ? "auto" : "none",
      }}
    >
      <DotsHorizontalIcon className="w-4 h-4" />
    </button>
  );
};

export default React.memo(SidebarOverlay);
