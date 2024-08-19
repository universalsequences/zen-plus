import { createContext, useState, useContext, useRef, useCallback, useEffect } from "react";
import type React from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import type { Message, Node} from "@/lib/nodes/types";
import { usePosition } from "./PositionContext";

interface IValueContext {
  value: Message | null;
  setNodeToWatch: React.Dispatch<React.SetStateAction<Node>>;
}

interface Props {
  node: Node;
  children: React.ReactNode;
}

const ValueContext = createContext<IValueContext | undefined>(undefined);

export const useValue = (): IValueContext => {
  const context = useContext(ValueContext);
  if (!context) throw new Error("useValueHandler must be used within ValueProvider");
  return context;
};

export const ValueProvider: React.FC<Props> = ({ node, children }) => {
  const [nodeToWatch, setNodeToWatch] = useState(node);
  const [value, setValue] = useState<Message | null>(null);
  const { patches, selectedPatch } = usePatches();
  const { patch, isCustomView } = usePatch();
  const { presentationMode } = usePosition();

  useEffect(() => {
    nodeToWatch.onNewValue = setValue;
    if (!nodeToWatch.onNewValues) {
      nodeToWatch.onNewValues = {};
    }
    nodeToWatch.onNewValues[node.id] = setValue;

    return () => {
      if (nodeToWatch.onNewValues) {
        delete nodeToWatch.onNewValues[node.id];
      }
    };
  }, [nodeToWatch, patches, selectedPatch, patch, isCustomView, presentationMode]);

  return (
    <ValueContext.Provider
      value={{
        value,
        setNodeToWatch,
      }}
    >
      {children}
    </ValueContext.Provider>
  );
};
