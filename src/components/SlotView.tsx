import React, { useState, useCallback, useEffect } from 'react';
import { File } from '@/lib/files/types';
import { OperatorContext, OperatorContextType, getAllContexts, getOperatorContext } from '@/lib/nodes/context';
import { useSubPatchLoader } from '@/hooks/useSubPatchLoader';
import { OnchainSubPatch } from '@/lib/onchain/fetch';
import SearchBox from './SearchBox';
import { ContextMenu } from '@radix-ui/themes';
import { useStorage } from '@/contexts/StorageContext';
import { usePatches } from '@/contexts/PatchesContext';
import { usePatch } from '@/contexts/PatchContext';
import { ObjectNode } from '@/lib/nodes/types';
import { DividerHorizontalIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

export const SLOT_VIEW_WIDTH = 180;

const SlotView: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let _name = objectNode.subpatch && objectNode.subpatch.name ? objectNode.subpatch.name : objectNode.text;
    const { closePatch, expandPatch, patches } = usePatches();
    const { registerConnection } = usePatch();
    let { fetchSubPatchForDoc, onchainSubPatches } = useStorage();
    const [searchText, setSearchText] = useState('');
    const [name, setName] = useState(_name);
    const { loadSubPatch } = useSubPatchLoader(objectNode);

    let [subpatches, setSubPatches] = useState([...onchainSubPatches].sort((a, b) => a.name.localeCompare(b.name)));

    useEffect(() => {
        let _sorted = [...onchainSubPatches].sort((a, b) => a.name.localeCompare(b.name));
        setSubPatches(_sorted.filter(x => searchText === "" || (x.moduleType && x.moduleType.includes(searchText.toLowerCase())) || x.name.toLowerCase().includes(searchText.toLowerCase())));
    }, [searchText, setSubPatches]);

    const load = useCallback(async (x: File) => {
        await loadSubPatch(x);
        setName(x.name);
    }, [setName]);

    let patchMemo = React.useMemo(() => {
        return (<div className="h-64 overflow-scroll">
            {subpatches.map(
                x =>
                    <ContextMenu.Item
                        key={x.id}
                        onClick={() => load(x)}
                        className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer text-xs flex">
                        <div className="">{x.name.slice(0, 20)}</div>
                        {x.moduleType && x.moduleType !== "other" && <div className="ml-auto text-zinc-400">{x.moduleType}</div>}
                    </ContextMenu.Item>)}
        </div>);
    }, [subpatches]);

    return (<ContextMenu.Root>
        <ContextMenu.Content
            onMouseDown={(e: any) => e.stopPropagation()}
            style={{ zIndex: 10000000000000 }}
            color="indigo" className="object-context rounded-lg p-2 text-xsflex flex-col overflow-hidden text-sm w-64">
            <div className="flex text-zinc-300 pb-2 mb-2 flex flex-col">
                <SearchBox searchText={searchText} setSearchText={setSearchText} />
            </div>
            {patchMemo}
        </ContextMenu.Content>
        <ContextMenu.Trigger
            className={"w-full flex h-full slot-view overflow-hidden " + objectNode.attributes.moduleType}>
            <div>
                <div className="mr-2 ml-auto my-auto text-white flex">
                    <div>{name}</div>
                    <div
                        onClick={() => {
                            if (objectNode.subpatch) {
                                if (patches.includes(objectNode.subpatch)) {
                                    closePatch(objectNode.subpatch);
                                    return;
                                }
                                objectNode.subpatch.justExpanded = true;
                            }
                            expandPatch(objectNode);
                        }}
                        className={(objectNode.subpatch && patches.includes(objectNode.subpatch) ? " bg-zinc-400 hover:bg-zinc-200 " : " hover:bg-zinc-700 ") + "w-3 h-3 my-auto rounded-full border border-1 border-zinc-600 ml-2 transition-colors cursor-pointer"} />
                </div>
            </div>
        </ContextMenu.Trigger>
    </ContextMenu.Root>);
};

export default SlotView;
