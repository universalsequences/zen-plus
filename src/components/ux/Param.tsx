import React, { useState } from 'react';
import { TriangleRightIcon } from '@radix-ui/react-icons'
import { ObjectNode } from '@/lib/nodes/types';

const Param: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let [value, setValue] = useState<number>(objectNode.inlets[0] && objectNode.inlets[0].lastMessage !== undefined ? objectNode.inlets[0].lastMessage as number : 0);

    return (<div className="w-32 h-7 bg-black-clear-light flex text-xs">
        <div className="m-1 bg-black flex pt-0.5 px-2 text-white">
            {objectNode.arguments[0] as string}
        </div>
        <div className="m-1 bg-black flex flex-1">
            <TriangleRightIcon className="w-5 h-5 mr-2 invert" />
            <div className="flex-1 text-white mt-0.5">
                {value}
            </div>
        </div>
    </div>);
};

export default Param;
