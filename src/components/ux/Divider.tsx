import React from 'react';
import { useLocked } from '@/contexts/LockedContext';
import { useSelection } from '@/contexts/SelectionContext';
import { ObjectNode } from '@/lib/nodes/types';

const Divider: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let { attributesIndex } = useSelection();
    let { lockedMode } = useLocked();
    console.log("orientation=", objectNode.attributes["orientation"]);
    if (objectNode.attributes["orientation"] === "vertical") {
        return <div style={{ width: 1 }} className="bg-zinc-500  h-full"></div>;
    } else {
        return <div style={{ height: 1 }} className="bg-zinc-500 w-full"></div>;
    }
};

export default Divider;
