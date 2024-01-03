import React, { useMemo, useRef } from 'react';
import { usePatch } from '@/contexts/PatchContext';
import { Node, Identifiable, Positioned } from '@/lib/nodes/types';
import { usePosition } from '@/contexts/PositionContext';

export const usePositionStyle = (node: Identifiable & Positioned, _isCustomView?: boolean) => {
    let { preparePresentationMode, presentationMode, coordinates } = usePosition();
    let { isCustomView } = usePatch();


    let nodePosition = isCustomView ? node.presentationPosition || node.position : coordinates[node.id];
    const prevMode = useRef<boolean>(presentationMode);

    const positionStyle = useMemo(() => {
        let _nodePosition = isCustomView ? node.presentationPosition || node.position : presentationMode ? node.presentationPosition || node.position || coordinates[node.id] : node.position || coordinates[node.id];
        if (_nodePosition) {
            let style: any = {
                left: _nodePosition.x + 'px',
                top: _nodePosition.y + 'px',
                zIndex: node.zIndex
            };
            // style.transition = 'left 0.5s ease, top 0.5s ease';
            if (node.presentationPosition && preparePresentationMode) {
                style.transition = 'left 0.5s ease, top 0.5s ease';
            }
            prevMode.current = presentationMode;
            return style;
        }
        return { left: 0, top: 0 };
    }, [nodePosition, node.zIndex, preparePresentationMode, isCustomView]);

    return positionStyle;
};
