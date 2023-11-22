import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

export type Connections = {
    [x: string]: IOConnection[];
}

interface IPatchesContext {
    basePatch: Patch;
    patches: Patch[];
    setPatches: (x: Patch[]) => void;
}

interface Props {
    children: React.ReactNode;
    basePatch: Patch;
}

const PatchesContext = createContext<IPatchesContext | undefined>(undefined);

export const usePatches = (): IPatchesContext => {
    const context = useContext(PatchesContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};

export const PatchesProvider: React.FC<Props> = ({ children, ...props }) => {
    const [basePatch, setBasePatch] = useState<Patch>(props.basePatch);
    const [patches, setPatches] = useState<Patch[]>([basePatch]);

    return <PatchesContext.Provider
        value={{
            patches,
            basePatch,
            setPatches
        }}>
        {children}
    </PatchesContext.Provider>;
};

