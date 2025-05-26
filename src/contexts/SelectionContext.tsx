import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import {
  Patch,
  IOlet,
  Node,
  Attributes,
  MessageNode,
  IOConnection,
  ObjectNode,
  Coordinate,
} from "@/lib/nodes/types";
import { PatchImpl } from "@/lib/nodes/Patch";
export type AttributesIndex = {
  [id: string]: Attributes;
};

interface ISelectionContext {
  opened: Node | null;
  setOpened: (x: Node | null) => void;
  lastResizingTime: React.MutableRefObject<number>;
  updateAttributes: (id: string, x: Attributes) => void;
  attributesIndex: AttributesIndex;
  selectedNodes: (ObjectNode | MessageNode)[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<(ObjectNode | MessageNode)[]>>;
  selectedConnection: IOConnection | null;
  setSelectedConnection: (x: IOConnection | null) => void;
  selection: Selection | null;
  setSelection: (x: Selection | null) => void;

  zoomRef: React.MutableRefObject<number>;
  zoom: number;
  setZoom: (x: number) => void;
}

export interface Selection {
  patch: Patch;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Props {
  children: React.ReactNode;
}

const SelectionContext = createContext<ISelectionContext | undefined>(undefined);

export const useSelection = (): ISelectionContext => {
  const context = useContext(SelectionContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

export const SelectionProvider: React.FC<Props> = ({ children }) => {
  let [opened, setOpened] = useState<Node | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const lastResizingTime = useRef(0);
  const [selectedNodes, setSelectedNodes] = useState<(ObjectNode | MessageNode)[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<IOConnection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    setSelection(null);
  }, [setSelection]);

  useEffect(() => {
    if (selectedNodes.length > 0) {
      setSelectedConnection(null);
    }
  }, [selectedNodes, setSelectedConnection]);

  useEffect(() => {
    if (selectedConnection) {
      setSelectedNodes([]);
    }
  }, [selectedConnection, setSelectedNodes]);

  const [attributesIndex, setAttributesIndex] = useState<AttributesIndex>({});

  let attributesRef = useRef<AttributesIndex>(attributesIndex);
  useEffect(() => {
    attributesRef.current = attributesIndex;
  }, [attributesIndex]);

  const updateAttributes = useCallback(
    (id: string, attribute: Attributes) => {
      let attrs = { ...attributesRef.current };
      attrs[id] = { ...attribute };
      console.log("update attributes called  with attrs", attrs);
      setAttributesIndex(attrs);
      attributesRef.current = attrs;
    },
    [setAttributesIndex],
  );

  return (
    <SelectionContext.Provider
      value={{
        attributesIndex,
        updateAttributes,
        selectedConnection,
        setSelectedConnection,
        selectedNodes,
        setSelectedNodes,
        setZoom,
        zoom,
        zoomRef,
        selection,
        setSelection,
        lastResizingTime,
        setOpened,
        opened,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};
