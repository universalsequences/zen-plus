import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

interface ISelectionContext {
    selectedNodes: (ObjectNode | MessageNode)[];
    setSelectedNodes: (x: ((ObjectNode | MessageNode)[])) => void;
    selectedConnection: IOConnection | null;
    setSelectedConnection: (x: IOConnection | null) => void;
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

    const [selectedNodes, setSelectedNodes] = useState<(ObjectNode | MessageNode)[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<IOConnection | null>(null);

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

    return <SelectionContext.Provider
        value={{
            selectedConnection,
            setSelectedConnection,
            selectedNodes,
            setSelectedNodes,
        }}>
        {children}
    </SelectionContext.Provider>;
};

