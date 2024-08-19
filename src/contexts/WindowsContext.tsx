import { BaseNode } from "@/lib/nodes/BaseNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import type { Patch, IOlet, Message, Coordinate, SubPatch, ObjectNode } from "@/lib/nodes/types";
import { createContext, useState, useContext, useCallback, useEffect } from "react";
import { usePatches } from "./PatchesContext";

interface IWindowsContext {
  patchWindows: Patch[];
  addPatchWindow: (x: Patch) => void;
  removePatchWindow: (x: Patch) => void;
  windowPositions: Positions;
  updatePosition: (x: string, y: Coordinate) => void;
  setPatchWindows: React.Dispatch<React.SetStateAction<Patch[]>>;
  setSideNodeWindow: React.Dispatch<React.SetStateAction<ObjectNode | null>>;
  sideNodeWindow: ObjectNode | null;
}

interface Props {
  children: React.ReactNode;
}

const WindowsContext = createContext<IWindowsContext | undefined>(undefined);

export const useWindows = (): IWindowsContext => {
  const context = useContext(WindowsContext);
  if (!context) throw new Error("useWorkerHandler must be used within LockedProvider");
  return context;
};

type Positions = {
  [x: string]: Coordinate;
};

export const WindowsProvider: React.FC<Props> = ({ children }) => {
  const { basePatch, selectedPatch, patches, setSelectedPatch } = usePatches();
  const [patchWindows, setPatchWindows] = useState<Patch[]>([]);
  const [sideNodeWindow, setSideNodeWindow] = useState<ObjectNode | null>(null);
  const [windowPositions, setWindowPositions] = useState<Positions>({});

  useEffect(() => {
    basePatch.setPatchWindows = setPatchWindows;
    basePatch.setSideNodeWindow = setSideNodeWindow;
  }, [setPatchWindows, basePatch]);

  /*
  useEffect(() => {
    if (!selectedPatch) {
      return;
    }
    setPatchWindows((prev) => {
      const p = [...prev].filter((x) => x !== selectedPatch);
      if (prev.includes(selectedPatch)) {
        return [...p, selectedPatch];
      }
      return p;
    });
  }, [selectedPatch]);
  */

  const getPatchSize = (patch: Patch) => {
    return (patch as SubPatch).parentNode.size || { width: 200, height: 200 };
  };

  const findNextAvailablePosition = useCallback(
    (size: { width: number; height: number }) => {
      const padding = 50; // Padding between windows
      let position: Coordinate = { x: 0, y: window.innerHeight - size.height }; // Start from bottom left
      let lowestY = window.innerHeight; // Track the lowest Y of the current row

      while (true) {
        let overlapping = false;
        for (const key in windowPositions) {
          const pos = windowPositions[key];
          const patchWindow = patchWindows.find((patch) => patch.id === key);
          if (!patchWindow) continue;
          const existingPatchSize = getPatchSize(patchWindow);

          // Update lowestY to keep track of the lowest window in the current row
          if (pos.y < lowestY && pos.y > position.y - size.height - padding) {
            lowestY = pos.y;
          }

          if (
            position.x < pos.x + existingPatchSize.width + padding &&
            position.x + size.width + padding > pos.x &&
            position.y > pos.y - size.height - padding &&
            position.y - size.height - padding < pos.y + existingPatchSize.height
          ) {
            overlapping = true;
            position.x = pos.x + existingPatchSize.width + padding;
            if (position.x + size.width > window.innerWidth) {
              position.x = 0;
              position.y = lowestY - size.height - padding; // Place just above the lowest window in the current row
              lowestY = window.innerHeight; // Reset lowestY for the new row
            }
            break;
          }
        }
        if (!overlapping) break;
      }
      return {
        x: position.x,
        y: Math.max(50, position.y - 30),
      };
    },
    [windowPositions, patchWindows],
  );
  const addPatchWindow = useCallback(
    (patch: Patch) => {
      const patchSize = getPatchSize(patch);
      const newPosition = findNextAvailablePosition(patchSize);

      setPatchWindows((prev) => [...prev, patch]);
      //updatePosition(patch.id, newPosition);
      setWindowPositions((prev) => ({ ...prev, [patch.id]: newPosition }));
    },
    [findNextAvailablePosition],
  );

  const removePatchWindow = useCallback(
    (patch: Patch) => {
      setPatchWindows(patchWindows.filter((x) => x !== patch));
      setSelectedPatch(patches[0]);
    },
    [patches, patchWindows, setSelectedPatch],
  );

  const updatePosition = useCallback((id: string, position: Coordinate) => {
    setWindowPositions((prev) => ({ ...prev, [id]: position }));
  }, []);

  return (
    <WindowsContext.Provider
      value={{
        addPatchWindow,
        removePatchWindow,
        patchWindows,
        windowPositions,
        updatePosition,
        setPatchWindows,
        sideNodeWindow,
        setSideNodeWindow,
      }}
    >
      {children}
    </WindowsContext.Provider>
  );
};
