import { createContext, useState, useContext, useRef, useCallback, useEffect } from "react";
import { useMessage } from "./MessageContext";
import type { Message, Node, Patch } from "@/lib/nodes/types";
import { usePatch } from "./PatchContext";

interface ILockedContext {
  lockedMode: boolean;
  setLockedMode: (x: boolean) => void;
}

interface Props {
  patch: Patch;
  children: React.ReactNode;
}

const LockedContext = createContext<ILockedContext | undefined>(undefined);

export const useLocked = (): ILockedContext => {
  const context = useContext(LockedContext);
  if (!context) throw new Error("useLockedHandler must be used within LockedProvider");
  return context;
};

export const LockedProvider: React.FC<Props> = ({ patch, children }) => {
  const { buffer } = usePatch();
  const [lockedMode, setLockedMode] = useState<boolean>(
    patch.lockedMode === true
      ? true
      : patch.lockedMode === undefined
        ? patch.objectNodes.length > 8
        : patch.lockedMode,
  );

  useEffect(() => {
    if (patch.lockedMode !== undefined) {
      setLockedMode(patch.lockedMode);
    }
    /*
    if (
      patch.objectNodes.some((x) => x.attributes["Include in Presentation"]) &&
      patch.justExpanded
    ) {
      setLockedMode(true);
      setTimeout(() => {
        patch.justExpanded = false;
      }, 100);
    } else {
      if (patch.lockedMode !== undefined) {
        setLockedMode(patch.lockedMode);
      }
    }
      */
    if (patch.lockedMode !== undefined) {
      setLockedMode(patch.lockedMode);
    }
  }, [patch]);

  return (
    <LockedContext.Provider
      value={{
        lockedMode: buffer ? true : lockedMode,
        setLockedMode,
      }}
    >
      {children}
    </LockedContext.Provider>
  );
};
