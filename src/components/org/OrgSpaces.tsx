import React from 'react';
import { Patch, SubPatch } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';

const OrgSpaces: React.FC<{ patch: Patch }> = ({ patch }) => {
    let { rootTile, patches, selectedPatch } = usePatches();
    return <div className="flex absolute top-0 left-20 bottom-0 my-auto ">
        <div className="flex my-auto w-12 flex-wrap content-start object-start items-start">
            {patches.map((x, i) => {
                let type = (x as SubPatch).parentNode && (x as SubPatch).parentNode.attributes.type;
                return <div
                    key={i}
                    className={`${selectedPatch === x ? " text-zinc-400" : " text-zinc-200"} border my-auto h-2 w-2 m-0.5 text-xs rounded-sm ${type === 'audio' ? "border-yellow-300" : type === "gl" ? "border-purple-500" : type === 'zen' ? "border-teal-200" : "border-zinc-400"} content-start `}></div>
            })}
        </div>
    </div>;
};

export default OrgSpaces;
