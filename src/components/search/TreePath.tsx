import React, { useEffect, useCallback, useRef, useState } from 'react';
import { MagnifyingGlassIcon, ArrowLeftIcon, GlobeIcon, CaretRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import { BoxModelIcon, CubeIcon } from '@radix-ui/react-icons'
import { SubPatch, Patch } from '@/lib/nodes/types';


const TreePath: React.FC<{ patch: SubPatch }> = ({ patch }) => {
    let path = [];
    while (patch.parentPatch) {
        patch = patch.parentPatch as SubPatch;
        if (patch.name) {
            path.push(patch.name);
        }
    }
    return <div style={{ fontSize: 8 + 'px', lineHeight: '16px' }} className="flex  ml-auto text-zinc-300">
        {path.map((x, i) => <><div className="mr-1">{x}</div>
            {i < path.length - 1 && <CaretRightIcon className="w-3 h-3 mx-1" />}
        </>)}
    </div>;
};


export default TreePath;
