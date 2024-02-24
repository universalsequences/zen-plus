import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { useMessage } from './MessageContext';
import { Message, Node, Patch } from '@/lib/nodes/types';

interface ILockedContext {
    lockedMode: boolean;
    setLockedMode: (x: boolean) => void;
}

interface Props {
    patch: Patch;
    children: React.ReactNode;
}

const LockedContext = createContext<ILockedContext | undefined>(undefined);

export const useLocked = (): ILockedContext => {
    const context = useContext(LockedContext);
    if (!context) throw new Error('useLockedHandler must be used within LockedProvider');
    return context;
};

export const LockedProvider: React.FC<Props> = ({ patch, children }) => {

    const [lockedMode, setLockedMode] = useState(true);

    useEffect(() => {
        if (patch.objectNodes.some(x => x.attributes["Include in Presentation"]) && patch.justExpanded) {
            setLockedMode(true);
            setTimeout(() => {
                patch.justExpanded = false;
            }, 100);
        } else {
            setLockedMode(false);
        }
    }, [patch]);

    return <LockedContext.Provider
        value={{
            lockedMode,
            setLockedMode
        }}>
        {children}
    </LockedContext.Provider>;
};

