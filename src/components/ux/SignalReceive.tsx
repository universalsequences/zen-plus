import React, { useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { publish } from '@/lib/messaging/queue';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { OperatorContextType } from '@/lib/nodes/context';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ObjectNode, SubPatch, Patch, SignalOption } from '@/lib/nodes/types';
import { ContextMenu } from '@radix-ui/themes';
import { TriangleDownIcon } from '@radix-ui/react-icons';
import { useLocked } from '@/contexts/LockedContext';

const SignalReceive: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const { setSelectedNodes, selectedNodes } = useSelection();
    const [options, setOptions] = useState<SignalOption[]>([]);

    const { lockedMode } = useLocked();
    useEffect(() => {
        let patch = objectNode.patch;
        while ((patch as SubPatch).parentPatch) {
            patch = (patch as SubPatch).parentPatch;
        }
        let allNodes = patch.getAllNodes();
        let options: SignalOption[] = [];
        for (let node of allNodes) {
            if (node.name === "send~" || node.name === "publishPatchSignals") {
                if (node.signalOptions) {
                    options = [...options, ...node.signalOptions];
                } else {
                    options = [...options, {
                        node: node,
                        name: node.arguments[0] as string
                    }];
                }
            }
        }
        setOptions(options);
    }, []);

    const [selected, setSelected] = useState<SignalOption | null>(null);

    useEffect(() => {
        let name = objectNode.arguments[0];
        let signalNumber = objectNode.arguments[1];
        if (name && signalNumber !== undefined) {
            let option = options.find(x => x.name === name && x.signalNumber === signalNumber);
            if (option) {
                setSelected(option);
            }
        } else if (name) {
            let option = options.find(x => x.name === name);
            if (option) {
                setSelected(option);
            }
        }
    }, [options, setSelected]);

    const select = useCallback((option: SignalOption) => {
        setSelected(option);
        if (option.name && option.signalNumber !== undefined) {
            let text = option.name + ' ' + option.signalNumber;
            objectNode.text = "receive~ " + text + " @ui 1";
            objectNode.arguments[0] = option.name;
            objectNode.arguments[1] = option.signalNumber;
            console.log('sending update...');
            if (objectNode.fn) {
                objectNode.fn([]);
            }
        } else if (option.name) {
            objectNode.text = "receive~ " + option.name;
            objectNode.arguments[0] = option.name;
            objectNode.arguments[1] = undefined as any;
            console.log('sending update...');
            if (objectNode.fn) {
                objectNode.fn([]);
            }
        }
    }, [setSelected]);;

    return (<DropdownMenu.Root
        onOpenChange={() => {
            console.log('on click setting nodes');
            setSelectedNodes([objectNode]);
        }}

    >
        <DropdownMenu.Content
            onMouseDown={(e: any) => {
                e.stopPropagation();
                console.log('on click setting nodes');
                setSelectedNodes([objectNode]);
            }}
            onClick={(e: any) => {
                console.log('on click setting nodes');
                setSelectedNodes([objectNode]);
            }}
            style={{ zIndex: 10000000000000 }}
            color="indigo" className="object-context rounded-lg p-2 text-xs flex flex-col  text-sm w-96 h-64 ">
            <div className="flex text-zinc-300 pb-2 mb-2 flex flex-col overflow-hidden">
                <div className="flex text-zinc-500 border-b border-b-zinc-500 mb-2">
                    <div className="w-20">Name</div>
                    <div className="w-8">#</div>
                    {/*<div className="w-12">Module Type</div>*/}
                    <div className="w-12">IO</div>
                    <div className="flex-1 ">Patch Name</div>
                    <div className="w-16 ml-auto mr-2">Outlet</div></div>

                <div
                    className="flex-1 overflow-y-scroll overflow-x-hidden"
                >{options.map((x, i) => <div
                    onClick={() => select(x)}
                    key={i}
                    className={selected === x ? "flex bg-white text-black cursor-pointer" : "flex cursor-pointer"}>
                    <div className="w-20">{x.name}</div>
                    <div className="w-8">{x.signalNumber}</div>
                    {/*<div className="w-12">{x.moduleType}</div>*/}
                    <div className="w-12">{x.io}</div>
                    <div className="flex-1 overflow-hidden">{x.moduleName}</div>
                    <div className="w-16 ml-auto mr-2">{x.outlet && x.outlet.name ? x.outlet.name : ""} </div></div>)}
                </div>
            </div>
        </DropdownMenu.Content>
        <DropdownMenu.Trigger
            onChange={() => {
                console.log('on click setting nodes');
                setSelectedNodes([objectNode]);
            }}
            className={(selectedNodes[0] === objectNode ? "bg-zinc-800 text-black " : "") + (!lockedMode ? "pointer-events-none " : "") + "w-full flex my-auto slot-view overflow-hidden bg-black px-2 my-auto text-white w-full active:border w-32 "}>
            <div
                onMouseDown={(e: any) => {
                    console.log('on click setting nodes');
                    setSelectedNodes([objectNode]);
                }}
                onClick={(e: any) => {
                    console.log('on click setting nodes');
                    setSelectedNodes([objectNode]);
                }}

                className="flex w-full">
                r~: {selected ? (selected.name + ' ' + (selected && selected.signalNumber !== undefined ? selected.signalNumber : "")) : "select signal"}

                <TriangleDownIcon className="ml-auto w-4 h-4" />
            </div>
        </DropdownMenu.Trigger>
    </DropdownMenu.Root >)
}

export default SignalReceive;
