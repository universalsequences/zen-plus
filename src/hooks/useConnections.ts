import React from 'react';
import { usePatch } from '@/contexts/PatchContext';

export const useConnections = (id: string) => {
    let { connections } = usePatch();

    return connections[id];
};
