import React, { memo, useEffect, useCallback, useState } from 'react';;
import LockButton from './LockButton';
import PresentationMode from './PresentationMode';
import PatchDropdown from './PatchDropdown';
import LoadProject from './LoadProject';
import { useStorage } from '@/contexts/StorageContext';
import { usePosition } from '@/contexts/PositionContext';
import * as Dialog from '@radix-ui/react-dialog';
import { GlobeIcon, CaretRightIcon, Cross2Icon } from '@radix-ui/react-icons'
import { DropdownMenu } from '@radix-ui/themes';
import { usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import Assistant from './Assistant';
import {
    Patch, SubPatch
} from '@/lib/nodes/types';

enum Option {
    Save,
    Load,
}
const Toolbar: React.FC<{ patch: Patch }> = ({ patch }) => {

    const { updatePositions } = usePosition();
    // for now this will simply tell us what nested subpatches are
    const [option, setOption] = useState<Option | null>(null);

    const { changeTileForPatch, closePatch, patches, setPatches } = usePatches();
    const { assist } = usePatch();
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
        className="text-white my-auto text-xs rounded-full cursor-pointer" >
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

    const selectPatch = useCallback((_patch: Patch) => {
        console.log('select patch');

        /*
        if (!(_patch as SubPatch).parentPatch) {
            // base patch chosen-- so we close
            _closePatch();
            if (patches.length === 1) {
                setPatches([_patch]);
            }
            return;
        }
        */
        changeTileForPatch(patch, _patch);
        /*
        let indexOf = patches.indexOf(patch);
        let _patches = [...patches];
        _patches[indexOf] = _patch;
        setPatches(_patches);
        */
    }, [setPatches, patches, patch]);

    while ((_patch as SubPatch).parentPatch) {
        key++;
        _patch = (_patch as SubPatch).parentPatch;
        let p = _patch;
        let __patch = _patch;
        breadcrumbs.push(<div
            onClick={() => selectPatch(p)}
            key={key}
            className=" my-auto text-zinc-400 cursor-pointer text-xs rounded-full flex">
            {(_patch as SubPatch).parentPatch === undefined ? "base patch" : (_patch.name || "patch")}
            <CaretRightIcon className="w-2 mx-2" />
        </div>);
    }

    breadcrumbs.reverse();

    const _closePatch = useCallback(() => {
        let _p = patches.filter(x => x !== patch);
        if (_p.length === 0) {
            _p = [(patch as SubPatch).parentPatch];
        }
        setPatches(_p);
    }, [patches, setPatches, patch]);

    let [showAssist, setShowAssist] = useState(false);
    let [assistText, setAssistText] = useState("");
    let [loading, setLoading] = useState(false);

    if (breadcrumbs.length === 1) {
        return <div
            style={{ height: 35 }}
            className="flex fixed top-0 left-0  full w-full">
            <div className="flex-1 m-1 bg-toolbar relative rounded-full flex px-5  top-toolbar h-10 ">
                <PatchDropdown patch={patch}>
                    <GlobeIcon className="w-6 h-6 mt-1 mr-3 cursor-pointer" />
                </PatchDropdown>
                <div
                    style={{ borderLeft: "1px solid white" }}
                    className="ml-auto top-0 bottom my-auto pt-0.5 right-0 px-5 flex w-64">
                    <LockButton />
                    <PresentationMode />
                    <div className="ml-auto mr-5 my-auto text-sm">zen+</div>
                </div>
            </div>
        </div>;
    }

    return <div
        style={{ zIndex: 100000000000000, height: 35 }}
        onClick={(e: any) => e.stopPropagation()}
        onMouseDown={(e: any) => e.stopPropagation()}
        className="flex fixed top-0 left-0  full w-full ">
        <div className="flex-1 m-1 bg-toolbar relative rounded-full flex px-5  top-toolbar h-10 ">
            <PatchDropdown patch={patch}>
                <GlobeIcon className="w-6 h-6 mt-1 mr-3 cursor-pointer" />
            </PatchDropdown>
            <div className="flex relative pr-8 my-auto mx-auto">
                {breadcrumbs}
                <Cross2Icon onClick={() => {
                    closePatch(patch);
                }} className="w-3 h-3 absolute top-0 bottom-0 my-auto right-2 cursor-pointer" />
            </div>
            <div
                style={{ borderLeft: "1px solid white" }}
                className="absolute right-0 bottom-0 top-0 table my-auto pt-0.5 right-0 px-5 flex w-64">
                <div className="flex">
                    <LockButton />
                    <PresentationMode />
                    <div className="ml-auto mr-5 my-auto text-sm">zen+</div>
                </div>
            </div>
        </div>
    </div>;
};

export default Toolbar;
