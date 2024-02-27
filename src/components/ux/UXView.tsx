import React, { useEffect } from 'react';
import { ObjectNode } from '@/lib/nodes/types';
import { optionalIndex, NodeProps } from './index';

const UXView: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let CustomComponent = (objectNode.name ? optionalIndex[objectNode.name] : undefined) as unknown as React.ComponentType<NodeProps>;

    if (CustomComponent) {
        return <CustomComponent objectNode={objectNode} />
    }
    return <></>;
};

export default UXView;
