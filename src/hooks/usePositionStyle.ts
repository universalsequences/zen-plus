import React, { useMemo } from 'react';
import { Node, Identifiable, Positioned } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';

export const usePositionStyle = (node: Identifiable & Positioned) => {
    let { coordinates } = usePosition();

    let nodePosition = coordinates[node.id];

    const positionStyle = useMemo(() => {
        if (nodePosition) {
            return {
                left: nodePosition.x + 'px',
                top: nodePosition.y + 'px',
                zIndex: node.zIndex
            };
        }
        return { left: 0, top: 0 };
    }, [nodePosition, node.zIndex]);

    return positionStyle;
};
