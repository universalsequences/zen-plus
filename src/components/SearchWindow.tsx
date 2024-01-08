import React, { useEffect, useCallback, useRef, useState } from 'react';
import { CubeIcon } from '@radix-ui/react-icons'
import { SubPatch, Patch } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';

const SearchWindow: React.FC<{ hide: () => void }> = ({ hide }) => {
    const ref = useRef<HTMLInputElement>(null);
    let { basePatch } = usePatches();
    let [text, setText] = useState("");

    useEffect(() => {
        if (ref.current) {
            ref.current.focus();
        }
    }, []);
    return (<div
        onClick={() => hide()}
        style={{
            backgroundColor: "transparent",
            backdropFilter: "blur(2px)",
            zIndex: 10000000000
        }} className="fixed top-0 left-0 w-full h-full">
        <div
            //style={{ maxHeight: 300 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            className="dark-modal absolute top-0 left-0 bottom-0 right-0 flex flex-col w-64 h-96 m-auto p-2 rounded-md  text-xs">
            <input ref={ref} value={text} onChange={(e: any) => setText(e.target.value)} className="bg-black-blur border border-zinc-500 mb-3 rounded-full text-white h-8 outline-none px-2" />
            <div className="text-xs flex-1 overflow-scroll">
                {basePatch.objectNodes.filter(x => x.subpatch).map(
                    (x, i) => <Tree key={x.id} searchTerm={text} patch={x.subpatch!} hide={hide} />)}
            </div>
        </div>
    </div>);
}

const Tree: React.FC<{ patch: Patch, searchTerm: string, hide: () => void }> = ({ searchTerm, patch, hide }) => {
    let { setPatches, expandPatch, patches } = usePatches();
    let isSelected = patches.includes(patch);
    return <div>
        {(searchTerm === "" || !patch.name || patch.name.toLowerCase().includes(searchTerm.toLowerCase())) && <div
            onClick={() => {
                expandPatch((patch as SubPatch).parentNode);
                // setPatches([patch]);
                hide();
            }}
            style={isSelected ? { backgroundColor: "#cffff8" } : {}}
            className={(isSelected ? "  text-black " : "") + " pl-3 hover:bg-white hover:text-black cursor-pointer flex py-1"}><CubeIcon className="mr-1 w-2" /> {patch.name}</div>}
        <div className="ml-3">
            {patch.objectNodes.filter(x => x.subpatch).map(
                x => <Tree key={x.id} patch={x.subpatch!} searchTerm={searchTerm} hide={hide} />)}
        </div>
    </div>
};

export default SearchWindow;
