import React from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { IOConnection } from '@/lib/nodes/types';

export const useSelectedConnection = (connection: IOConnection) => {

    const { setSelectedConnection, selectedConnection, setSelectedNodes } = usePosition();

    return {
        isSelected: selectedConnection === connection,
        select: () => {
            setSelectedConnection(connection);
        }
    };
};



