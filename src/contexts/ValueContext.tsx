import { createContext, useState, useContext, useRef, useCallback, useEffect } from "react";
import type React from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import type { Message, Node, ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "./PositionContext";
import { enhanceNodeWithMultipleSubscribers } from "@/lib/nodes/utils/enhanceNodeSubscriptions";

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
  const [value, setValue] = useState<Message | null>(node.lastOnValue ?? null);
  const { patches, selectedPatch } = usePatches();
  const { patch, isCustomView } = usePatch();
  const { presentationMode } = usePosition();

  useEffect(() => {
    if (value !== null) node.lastOnValue = value;
  }, [value]);

  useEffect(() => {
    // Enhance the node to support multiple subscribers if it's an ObjectNode
    if (nodeToWatch && 'custom' in nodeToWatch) {
      enhanceNodeWithMultipleSubscribers(nodeToWatch as ObjectNode);
    }
    
    // Now assign the callback - this will add to subscribers instead of replacing
    nodeToWatch.onNewValue = setValue;
    
    // Keep the existing onNewValues logic for backward compatibility
    if (!nodeToWatch.onNewValues) {
      nodeToWatch.onNewValues = {};
    }
    nodeToWatch.onNewValues[node.id] = setValue;

    return () => {
      // Clean up the onNewValues entry
      if (nodeToWatch.onNewValues) {
        delete nodeToWatch.onNewValues[node.id];
      }
      
      // The enhanced subscription cleanup happens automatically
      // via the _subscriberId mechanism in the proxy
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
