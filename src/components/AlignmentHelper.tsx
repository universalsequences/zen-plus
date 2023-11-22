import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';

const AlignmentHelper = () => {
    let { draggingNode, alignmentLines } = usePosition();
    if (!draggingNode) {
        return <></>
    }
    return alignmentLines.map(
        (alignmentLine, index) => <line key={index} opacity={0.5} x1={alignmentLine.x1} y1={alignmentLine.y1} x2={alignmentLine.x2} y2={alignmentLine.y2} stroke="#fa04bf" />);
}

export default AlignmentHelper;
