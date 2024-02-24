
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ValueProvider } from '@/contexts/ValueContext';
import { ObjectNode, Patch, Coordinate, Size, MessageNode, MessageType } from '@/lib/nodes/types';
import ObjectNodeComponent from './ObjectNodeComponent';

const ObjectNodeWrapper: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    return (
        <ValueProvider node={objectNode}>
            <ObjectNodeComponent
                objectNode={objectNode} />
        </ValueProvider>
    );
}

export default ObjectNodeWrapper;
