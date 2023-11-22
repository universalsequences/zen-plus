import React, { memo, useEffect, useCallback, useState } from 'react';;
import PatchDropdown from './PatchDropdown';
import LoadProject from './LoadProject';
import { useStorage } from '@/contexts/StorageContext';
import * as Dialog from '@radix-ui/react-dialog';
import { GlobeIcon, CaretRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import { DropdownMenu } from '@radix-ui/themes';
import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import {
    Patch, SubPatch
} from '@/lib/nodes/types';

enum Option {
    Save,
    Load,
}

const Toolbar = () => {

    // for now this will simply tell us what nested subpatches are
    const [option, setOption] = useState<Option | null>(null);

    const { patches, setPatches } = usePatches();
    const { patch, setPatch } = usePatch();
    let breadcrumbs: any[] = [];
    let _patch: Patch = patch;
    let [editing, setEditing] = useState(false);
    let [patchName, setPatchName] = useState(patch.name || "");

    let key = 0;

    useEffect(() => {
        window.addEventListener("click", stopEdit);
        return () => window.removeEventListener("click", stopEdit);
    }, [setEditing]);

    const stopEdit = useCallback((e: any) => {
        setEditing(false);
    }, [setEditing]);

    breadcrumbs.push(<div

        key={key}
        onClick={(e: any) => {
            e.stopPropagation();
            if (!editing) {
                setEditing(true);
            }
        }}
        className="text-white my-auto text-xs rounded-full py-1 cursor-pointer" >
        {
            editing ? <input
                onKeyDown={(e: any) => e.key === "Enter" ? setEditing(false) : 0}
                style={{ borderBottom: "1px solid #4f4f4f" }}
                value={patchName} onChange={
                    (e: any) => {
                        setPatchName(e.target.value);
                        patch.name = e.target.value;
                    }} className="text-white bg-black-clear outline-none px-1" /> : patch.name || "current patch"}
    </div >);
    while ((_patch as SubPatch).parentPatch) {
        key++;
        _patch = (_patch as SubPatch).parentPatch;
        let __patch = _patch;
        breadcrumbs.push(<div
            key={key}
            className=" my-auto text-white cursor-pointer text-xs rounded-full py-1 flex">
            {(_patch as SubPatch).parentPatch === undefined ? "base patch" : (_patch.name || "patch")}
            <CaretRightIcon className="w-2 mx-2" />
        </div>);
    }

    breadcrumbs.reverse();

    const closePatch = useCallback(() => {
        setPatches(patches.filter(x => x !== patch));
    }, [patches, setPatches, patch]);

    if (breadcrumbs.length === 1) {
        return <div className="absolute -top-6 left-0">
            <PatchDropdown patch={patch}>
                <GlobeIcon className="w-5 h-5 invert" />
            </PatchDropdown>
        </div>;
    }

    return <div
        style={{ zIndex: 100000000000 }}
        className="flex absolute -top-8 left-0  full bg-black-blur px-1  pr-8">
        <PatchDropdown patch={patch}>
            <GlobeIcon className="w-5 h-5 mt-1 mr-3" />
        </PatchDropdown>
        {breadcrumbs}
        <Cross2Icon onClick={closePatch} className="w-3 h-3 absolute top-0 bottom-0 my-auto right-2 cursor-pointer" />
    </div>;
};

export default Toolbar;
