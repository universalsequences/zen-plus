import React, { useEffect, useCallback, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import WriteOnchain from './WriteOnChain';
import { useAccount } from 'wagmi';
import LoadProject from './LoadProject';
import * as Dialog from '@radix-ui/react-dialog';
import { useStorage } from '@/contexts/StorageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DropdownMenu } from '@radix-ui/themes';
import {
    Patch, SubPatch
} from '@/lib/nodes/types';
const jsonpatch = require('fast-json-patch');

enum Option {
    Save,
    Load,
    CustomPresentation,
    Settings
}

interface Props {
    patch: Patch;
    children: React.ReactNode;
}

const PatchDropdown = React.memo((props: Props) => {
    const [open, setOpen] = useState<boolean | undefined>();
    const [option, setOption] = useState<Option | null>(null);
    const { patch, children } = props;
    let [name, setName] = useState(patch.name);
    const { savePatch, saveSubPatch } = useStorage();
    const [compressed, setCompressed] = useState<string | null>(null);
    const [tokenId, setTokenId] = useState<number | null>(null);
    const { setLightMode, lightMode } = useSettings();

    let account = useAccount();

    useEffect(() => {
        setName(name);
    }, [patch.name]);

    let isSubPatch: boolean = (patch as SubPatch).parentPatch !== undefined;


    const save = useCallback(() => {
        let json = patch.getJSON();
        if (isSubPatch) {
            savePatch(name as string, json).then(
                x => {
                    console.log('compressed=', x);
                    setCompressed(x);
                    //setCompressed(x);
                });
            // we are saving a sub patch
            //saveSubPatch(name as string, json);

            // subpatches always have 
        } else {
            let prev = patch.previousSerializedPatch;
            let current = json;
            if (prev && current && patch.previousTokenId) {
                const diff = jsonpatch.compare(prev, current);
                console.log("DIFF=", diff);
                json = diff;
            }
            savePatch(name as string, json).then(
                x => {
                    console.log('compressed=', x);
                    setCompressed(x);
                    //setCompressed(x);
                });
        }
        setOption(null);
    }, [patch, name, setOption, account, setCompressed]);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setOption, setOpen, option, name, patch]);

    const onKeyDown = useCallback((e: any) => {
        if (e.key === "o" && e.metaKey) {
            e.preventDefault();
            setOption(Option.Load);
        } else if (e.key === "s" && e.metaKey) {
            e.preventDefault();
            setOption(Option.Save);
        } else if (e.key === "Enter" && option === Option.Save) {
            save();
        }
    }, [setOption, setOpen, option, name, patch]);

    const customPresentation = useCallback(() => {
        let parentNode = (patch as SubPatch).parentNode;
        if (parentNode) {
            parentNode.setAttribute("Custom Presentation", !parentNode.attributes["Custom Presentation"]);
            parentNode.size = {
                width: 300,
                height: 300,
            };
        }
    }, [patch]);

    useEffect(() => {
        if (tokenId) {
            patch.previousTokenId = tokenId;
            patch.previousSerializedPatch = patch.getJSON();
            setCompressed(null);
        }
    }, [tokenId, setCompressed]);

    return (
        <div>
            {compressed && name && <WriteOnchain isSubPatch={isSubPatch} setTokenId={setTokenId} previousTokenId={isSubPatch ? 0 : patch.previousTokenId} compressed={compressed} name={name} />}
            <Dialog.Root
                open={option !== null}
            >
                <DropdownMenu.Root
                    open={open}
                >
                    <DropdownMenu.Trigger>
                        <button className="IconButton" aria-label="Customise options">
                            {children}
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                        style={{ zIndex: 10000000000000000 }}
                        color="indigo" className="bg-white text-zinc-800 p-3 DropdownMenuContent text-xs" sideOffset={5}>
                        <Dialog.Trigger
                        >
                            <DropdownMenu.Item
                                onClick={() => {
                                    console.log("onc lick called for save");
                                    setOption(Option.Save);
                                }}
                                className="DropdownMenuItem flex cursor-pointer pointer-events-auto">
                                Save <div className="RightSlot">⌘+S</div>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                onClick={() => {
                                    console.log("onc lick called for load");
                                    setOption(Option.Load);
                                }}
                                className="DropdownMenuItem flex cursor-pointer pointer-events-auto">
                                Load <div className="RightSlot">⌘+O</div>
                            </DropdownMenu.Item>
                            {isSubPatch && <DropdownMenu.Item
                                onClick={() => {
                                    console.log("onc lick called for load");
                                    customPresentation();
                                    setOption(null); //Option.CustomPresentation);
                                }}
                                className="DropdownMenuItem flex cursor-pointer pointer-events-auto">
                                {(patch as SubPatch).parentNode.attributes["Custom Presentation"] ?
                                    "Disable Custom Presentation" : "Enable Custom Presentation"}
                            </DropdownMenu.Item>}
                            {!isSubPatch && <DropdownMenu.Item
                                onClick={() => {
                                    setOption(Option.Settings);
                                }}
                                className="DropdownMenuItem flex cursor-pointer pointer-events-auto">
                                Settings
                            </DropdownMenu.Item>}
                        </Dialog.Trigger>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <Dialog.Portal>
                    <Dialog.Overlay

                        className="center-fixed" />
                    <Dialog.Content
                        onInteractOutside={() => setOption(null)}
                        style={{ zIndex: 100000000000 }}
                        className="center-fixed dark-modal  p-5 text-white rounded-lg outline-none">
                        {option === Option.Settings ?
                            <div className="flex flex-col">
                                <div className="text-base">Settings</div>
                                <div>
                                    <form>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <label className="Label" htmlFor="airplane-mode" style={{ paddingRight: 15 }}>
                                                Light Mode
                                            </label>
                                            <Switch.Root
                                                onCheckedChange={(e: boolean) => {
                                                    setLightMode(e);
                                                }}
                                                checked={lightMode}
                                                className="SwitchRoot" id="airplane-mode">
                                                <Switch.Thumb className="SwitchThumb" />
                                            </Switch.Root>
                                        </div>
                                    </form>
                                </div>
                                <Dialog.Close asChild>
                                    <button
                                        onClick={() => setOption(null)}
                                        className="bg-black mt-3 px-2 py-1 text-white rounded-full">Close</button>
                                </Dialog.Close>
                            </div> : option === Option.CustomPresentation ? <>
                                <div style={{ display: 'flex', marginTop: 25, justifyContent: 'flex-end' }}>
                                    <Dialog.Close asChild>
                                        <button
                                            onClick={customPresentation}
                                            className="bg-black px-2 py-1 text-white rounded-full">Custom</button>
                                    </Dialog.Close>
                                </div>
                            </> :
                                option === Option.Save ? <>
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
                                        {account ?
                                            <Dialog.Close asChild>
                                                <button
                                                    onClick={save}
                                                    className="bg-black px-2 py-1 text-white rounded-full">Save changes</button>
                                            </Dialog.Close> : <ConnectButton />}
                                    </div>
                                </> :
                                    <>
                                        <LoadProject hide={() => setOption(null)} isSubPatch={isSubPatch} patch={patch} />
                                    </>}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
});

export default PatchDropdown;
