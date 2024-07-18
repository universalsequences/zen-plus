import { BaseNode } from "@/lib/nodes/BaseNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import type {
  Patch,
  IOlet,
  Message,
  Coordinate,
  SubPatch,
} from "@/lib/nodes/types";
import { createContext, useState, useContext, useCallback } from "react";
import { usePatches } from "./PatchesContext";

interface IWindowsContext {
  patchWindows: Patch[];
  addPatchWindow: (x: Patch) => void;
  removePatchWindow: (x: Patch) => void;
  windowPositions: Positions;
  updatePosition: (x: string, y: Coordinate) => void;
}

interface Props {
  children: React.ReactNode;
}

const WindowsContext = createContext<IWindowsContext | undefined>(undefined);

export const useWindows = (): IWindowsContext => {
  const context = useContext(WindowsContext);
  if (!context)
    throw new Error("useWorkerHandler must be used within LockedProvider");
  return context;
};

type Positions = {
  [x: string]: Coordinate;
};

export const WindowsProvider: React.FC<Props> = ({ children }) => {
  const { patches, setSelectedPatch } = usePatches();
  const [patchWindows, setPatchWindows] = useState<Patch[]>([]);
  const [windowPositions, setWindowPositions] = useState<Positions>({});

  const getPatchSize = (patch: Patch) => {
    return (patch as SubPatch).parentNode.size || { width: 200, height: 200 };
  };

  const addPatchWindow = useCallback(
    (patch: Patch) => {
      setPatchWindows([...patchWindows, patch]);
    },
    [patchWindows],
  );

  const removePatchWindow = useCallback(
    (patch: Patch) => {
      setPatchWindows(patchWindows.filter((x) => x !== patch));
      setSelectedPatch(patches[0]);
    },
    [patches, patchWindows, setSelectedPatch],
  );

  const updatePosition = useCallback(
    (id: string, position: Coordinate) => {
      setWindowPositions({ ...windowPositions, [id]: position });
    },
    [windowPositions],
  );

  return (
    <WindowsContext.Provider
      value={{
        addPatchWindow,
        removePatchWindow,
        patchWindows,
        windowPositions,
        updatePosition,
      }}
    >
      {children}
    </WindowsContext.Provider>
  );
};
