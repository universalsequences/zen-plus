import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, Attributes, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';
export type AttributesIndex = {
    [id: string]: Attributes;
};

interface ISelectionContext {
    lastResizingTime: React.MutableRefObject<number>;
    updateAttributes: (id: string, x: Attributes) => void;
    attributesIndex: AttributesIndex;
    lockedMode: boolean;
    setLockedMode: (x: boolean) => void;
    selectedNodes: (ObjectNode | MessageNode)[];
    setSelectedNodes: (x: ((ObjectNode | MessageNode)[])) => void;
    selectedConnection: IOConnection | null;
    setSelectedConnection: (x: IOConnection | null) => void;
    selection: Selection | null;
    setSelection: (x: Selection | null) => void;
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
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};

export const SelectionProvider: React.FC<Props> = ({ children }) => {

    const lastResizingTime = useRef(0);
    const [selectedNodes, setSelectedNodes] = useState<(ObjectNode | MessageNode)[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<IOConnection | null>(null);
    const [lockedMode, setLockedMode] = useState(false);
    const [selection, setSelection] = useState<Selection | null>(null)

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
    const updateAttributes = useCallback((id: string, attribute: Attributes) => {
        let attrs = { ...attributesRef.current };
        attrs[id] = { ...attribute };
        setAttributesIndex(attrs);
        attributesRef.current = attrs;
    }, [setAttributesIndex]);



    return <SelectionContext.Provider
        value={{
            attributesIndex,
            updateAttributes,
            selectedConnection,
            setSelectedConnection,
            selectedNodes,
            setSelectedNodes,
            lockedMode,
            setLockedMode,
            selection,
            setSelection,
            lastResizingTime
        }}>
        {children}
    </SelectionContext.Provider>;
};

