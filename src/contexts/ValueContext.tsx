import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { usePatches } from '@/contexts/PatchesContext';
import { usePatch } from '@/contexts/PatchContext';
import { useMessage } from './MessageContext';
import { Message, Node, SerializedPatch } from '@/lib/nodes/types';

interface IValueContext {
    value: Message | null;
}

interface Props {
    node: Node;
    children: React.ReactNode;
}

const ValueContext = createContext<IValueContext | undefined>(undefined);

export const useValue = (): IValueContext => {
    const context = useContext(ValueContext);
    if (!context) throw new Error('useValueHandler must be used within ValueProvider');
    return context;
};

export const ValueProvider: React.FC<Props> = ({ node, children }) => {

    const [value, setValue] = useState<Message | null>(null);
    const { patches, selectedPatch } = usePatches();
    const { patch, isCustomView } = usePatch();

    useEffect(() => {
        if (selectedPatch === patch || isCustomView) {
            node.onNewValue = setValue;
        }
    }, [setValue, patches, selectedPatch, patch, isCustomView]);

    return <ValueContext.Provider
        value={{
            value
        }}>
        {children}
    </ValueContext.Provider>;
};

