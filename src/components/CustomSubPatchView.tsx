import React, { useEffect, useCallback, useState } from 'react';
import { PositionProvider } from '@/contexts/PositionContext';
import { usePatch, PatchProvider } from '@/contexts/PatchContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { ObjectNode, MessageNode } from '@/lib/nodes/types';
import PatchComponent from '@/components/PatchComponent';

const CustomSubPatchView: React.FC<{ objectNodes?: ObjectNode[], messageNodes?: MessageNode[], objectNode: ObjectNode }> = ({ objectNode, objectNodes, messageNodes }) => {
    let subpatch = objectNode.subpatch;
    if (subpatch) {
        return (
            <PatchProvider isCustomView={true} patch={subpatch}>
                <PositionProvider patch={subpatch}>
                    <Inner />
                </PositionProvider>
            </PatchProvider>
        );
    }
    return <></>;
}

const Inner = () => {
    let [visibleObjectNodes, setVisibleObjectNodes] = useState<ObjectNode[]>([]);
    let { objectNodes } = usePatch();
    useEffect(() => {
        let nodes = [];
        if (objectNodes) {
            for (let node of objectNodes) {
                if (node.attributes["Include in Presentation"]) {
                    nodes.push(node);
                }
            }
        }
        setVisibleObjectNodes(nodes);
    }, [objectNodes, setVisibleObjectNodes]);

    return (<PatchComponent maxWidth={100} maxHeight={100} visibleObjectNodes={visibleObjectNodes} isCustomView={true} index={0} />
    );
};
export default CustomSubPatchView;
