import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

export type Connections = {
    [x: string]: IOConnection[];
}

interface IPatchesContext {
    audioWorklet: AudioWorkletNode | null;
    setAudioWorklet: (x: AudioWorkletNode | null) => void;
    basePatch: Patch;
    patches: Patch[];
    setPatches: (x: Patch[]) => void;
    gridTemplate: string;
    setGridTemplate: (x: string) => void;
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
    const [audioWorklet, setAudioWorklet] = useState<AudioWorkletNode | null>(null);
    const [gridTemplate, setGridTemplate] = useState("1fr 1fr");

    basePatch.setAudioWorklet = setAudioWorklet;

    return <PatchesContext.Provider
        value={{
            gridTemplate,
            setGridTemplate,
            audioWorklet,
            setAudioWorklet,
            patches,
            basePatch,
            setPatches
        }}>
        {children}
    </PatchesContext.Provider>;
};

