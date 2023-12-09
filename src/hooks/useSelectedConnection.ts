import React from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { IOConnection } from '@/lib/nodes/types';

export const useSelectedConnection = (connection: IOConnection) => {

    const { setSelectedConnection, selectedConnection } = useSelection();

    return {
        isSelected: selectedConnection === connection,
        select: () => {
            setSelectedConnection(connection);
        }
    };
};



