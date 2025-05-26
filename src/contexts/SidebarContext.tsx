import type { ObjectNode } from "@/lib/nodes/types";
import { createContext, useState, useContext, useEffect } from "react";
import { usePatches } from "./PatchesContext";

interface ISidebarContext {
  sidebarObjects: ObjectNode[];
  addSidebarObject: (x: ObjectNode) => void;
  removeSidebarObject: (x: ObjectNode) => void;
  setSidebarObjects: React.Dispatch<React.SetStateAction<ObjectNode[]>>;
  isMinimized: boolean;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  currentSidebarObject: ObjectNode | null;
  setCurrentSidebarObject: React.Dispatch<React.SetStateAction<ObjectNode | null>>;
}

interface Props {
  children: React.ReactNode;
}

const SidebarContext = createContext<ISidebarContext | undefined>(undefined);

export const useSidebar = (): ISidebarContext => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
};

export const SidebarProvider: React.FC<Props> = ({ children }) => {
  const { basePatch } = usePatches();
  const [sidebarObjects, setSidebarObjects] = useState<ObjectNode[]>([]);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [currentSidebarObject, setCurrentSidebarObject] = useState<ObjectNode | null>(null);

  useEffect(() => {
    basePatch.setSidebarObjects = setSidebarObjects;
    basePatch.setCurrentSidebarObject = setCurrentSidebarObject;
    basePatch.setIsSidebarMinimized = setIsMinimized;
  }, [setSidebarObjects, setCurrentSidebarObject, setIsMinimized, basePatch]);

  const addSidebarObject = (objectNode: ObjectNode) => {
    setSidebarObjects(prev => {
      if (!prev.includes(objectNode)) {
        return [...prev, objectNode];
      }
      return prev;
    });
    setCurrentSidebarObject(objectNode);
    setIsMinimized(false);
  };

  const removeSidebarObject = (objectNode: ObjectNode) => {
    setSidebarObjects(prev => prev.filter(x => x !== objectNode));
    if (currentSidebarObject === objectNode) {
      setCurrentSidebarObject(null);
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarObjects,
        addSidebarObject,
        removeSidebarObject,
        setSidebarObjects,
        isMinimized,
        setIsMinimized,
        currentSidebarObject,
        setCurrentSidebarObject,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};