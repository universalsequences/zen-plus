import React, { useEffect, useCallback, useState } from 'react';
import LoadProject from './LoadProject';
import * as Dialog from '@radix-ui/react-dialog';
import { useStorage } from '@/contexts/StorageContext';
import { DropdownMenu } from '@radix-ui/themes';
import {
    Patch, SubPatch
} from '@/lib/nodes/types';

enum Option {
    Save,
    Load,
}

interface Props {
    patch: Patch;
    children: React.ReactNode;
}

const PatchDropdown = (props: Props) => {
    const [option, setOption] = useState<Option | null>(null);
    const { patch, children } = props;
    let [name, setName] = useState(patch.name);
    const { savePatch, saveSubPatch } = useStorage();

    useEffect(() => {
        setName(name);
    }, [patch.name]);

    let isSubPatch: boolean = (patch as SubPatch).parentPatch !== undefined;

    const save = useCallback(() => {
        let json = patch.getJSON();
        if (isSubPatch) {
            // we are saving a sub patch
            saveSubPatch(name, json);
        } else {
            savePatch(name, json);
        }
    }, [patch, name]);

    return (
        <div>
            <Dialog.Root>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <button className="IconButton" aria-label="Customise options">
                            {children}
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content color="indigo" className="bg-white text-zinc-800 p-3 DropdownMenuContent text-xs" sideOffset={5}>
                        <Dialog.Trigger>
                            <DropdownMenu.Item
                                onClick={() => setOption(Option.Save)}
                                className="DropdownMenuItem flex cursor-pointer">
                                Save <div className="RightSlot">⌘+S</div>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                onClick={() => setOption(Option.Load)}
                                className="DropdownMenuItem flex cursor-pointer">
                                Load <div className="RightSlot">⌘+S</div>
                            </DropdownMenu.Item>
                        </Dialog.Trigger>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <Dialog.Portal>
                    <Dialog.Overlay className="center-fixed" />
                    <Dialog.Content
                        style={{ zIndex: 100000000000 }}
                        className="center-fixed bg-black-blur-light p-5 text-white rounded-lg outline-none">
                        {option === Option.Save ? <>
                            <fieldset className="Fieldset">
                                <label className="Label mr-4" htmlFor="name">
                                    Name
                                </label>
                                <input
                                    style={{ borderBottom: "1px solid #4f4f4f" }}
                                    className="Input px-2 bg-black-clear text-white outline-none"
                                    placeholder="Enter name to save"
                                    value={name}
                                    onChange={
                                        (e: any) => setName(e.target.value)} defaultValue="" />
                            </fieldset>
                            <div style={{ display: 'flex', marginTop: 25, justifyContent: 'flex-end' }}>
                                <Dialog.Close asChild>
                                    <button
                                        onClick={save}
                                        className="bg-black px-2 py-1 text-white rounded-full">Save changes</button>
                                </Dialog.Close>
                            </div>
                        </> :
                            <>
                                <LoadProject isSubPatch={isSubPatch} patch={patch} />
                            </>}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}

export default PatchDropdown;
