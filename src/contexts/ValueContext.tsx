import {
  createContext,
  useState,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from "react";
import type React from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import { useMessage } from "./MessageContext";
import type { Message, Node, SerializedPatch } from "@/lib/nodes/types";
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
  if (!context)
    throw new Error("useValueHandler must be used within ValueProvider");
  return context;
};

export const ValueProvider: React.FC<Props> = ({ node, children }) => {
  const [nodeToWatch, setNodeToWatch] = useState(node);
  const [value, setValue] = useState<Message | null>(null);
  const { patches, selectedPatch } = usePatches();
  const { patch, isCustomView } = usePatch();
  const isBeingWatched = useRef(false);
  const { presentationMode } = usePosition();

  useEffect(() => {
    if (selectedPatch === patch || isCustomView) {
      nodeToWatch.onNewValue = setValue;
    }
  }, [
    nodeToWatch,
    patches,
    selectedPatch,
    patch,
    isCustomView,
    presentationMode,
  ]);

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
