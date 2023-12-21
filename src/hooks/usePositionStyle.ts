import React, { useMemo, useRef } from 'react';
import { Node, Identifiable, Positioned } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';

export const usePositionStyle = (node: Identifiable & Positioned, isCustomView?: boolean) => {
    let { preparePresentationMode, presentationMode, coordinates } = usePosition();
    let nodePosition = isCustomView ? node.presentationPosition || node.position : coordinates[node.id];
    const prevMode = useRef<boolean>(presentationMode);

    const positionStyle = useMemo(() => {
        if (nodePosition) {
            let style: any = {
                left: nodePosition.x + 'px',
                top: nodePosition.y + 'px',
                zIndex: node.zIndex
            };
            // style.transition = 'left 0.5s ease, top 0.5s ease';
            if (node.presentationPosition && preparePresentationMode) {
                console.log('transition called!');
                style.transition = 'left 0.5s ease, top 0.5s ease';
            }
            prevMode.current = presentationMode;
            return style;
        }
        return { left: 0, top: 0 };
    }, [nodePosition, node.zIndex, preparePresentationMode]);

    return positionStyle;
};
