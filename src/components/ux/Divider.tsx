import React from 'react';
import { ObjectNode } from '@/lib/nodes/types';

const Divider: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    return <div style={{ height: 1 }} className="bg-white w-full"></div>;
};

export default Divider;
