import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TypeError, TypeSuccess } from '@/lib/nodes/typechecker';
import { fetchOnchainSubPatch } from '@/lib/onchain/fetch';
import { usePublicClient } from 'wagmi';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { OperatorContext, OperatorContextType, getAllContexts, getOperatorContext } from '@/lib/nodes/context';
import { ContextDefinition } from '@/hooks/useAutoComplete';
import AutoCompletes from './AutoCompletes';
import { index, NodeProps } from './ux/index';
import Attributes from './Attributes';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { SizeIndex, usePosition, DraggingNode } from '@/contexts/PositionContext';
import { usePatches } from '@/contexts/PatchesContext';
import PositionedComponent from './PositionedComponent';
import { ObjectNode, Patch, Coordinate, Size, MessageNode } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { usePatch } from '@/contexts/PatchContext';
import CustomSubPatchView from './CustomSubPatchView';
import { useMessage } from '@/contexts/MessageContext';
import { useStorage } from '@/contexts/StorageContext';

const ObjectNodeComponent: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const { setSelection, lockedMode, selectedNodes, setSelectedNodes } = useSelection();
    const { updatePosition, sizeIndexRef } = usePosition();

    let { messages } = useMessage();
    let errorMessage = messages[objectNode.id];

    let lockedModeRef = useRef(lockedMode);
    useEffect(() => {
        lockedModeRef.current = lockedMode;
    }, [lockedMode]);

    let isSelected = selectedNodes.includes(objectNode);
    let out = React.useMemo(() => {
        return <InnerObjectNodeComponent
            lockedModeRef={lockedModeRef}
            sizeIndexRef={sizeIndexRef}
            objectNode={objectNode}
            setSelection={setSelection}
            setSelectedNodes={setSelectedNodes}
            updatePosition={updatePosition}
            isSelected={isSelected}
            typeError={errorMessage as (TypeError | undefined)}
        />
    }, [objectNode, setSelectedNodes, isSelected, setSelection, errorMessage]);

    return out;
};

const InnerObjectNodeComponent: React.FC<{
    typeError: TypeSuccess | TypeError | undefined,
    setSelection: any,
    isSelected: boolean,
    lockedModeRef: React.MutableRefObject<boolean>,
    sizeIndexRef: React.MutableRefObject<SizeIndex>,
    updatePosition: (id: string, position: Coordinate) => void;
    setSelectedNodes: (x: (ObjectNode | MessageNode)[]) => void,
    objectNode: ObjectNode
}> =
    ({
        typeError,
        updatePosition,
        setSelection,
        lockedModeRef,
        sizeIndexRef,
        isSelected,
        objectNode,
        setSelectedNodes,
    }) => {


        const publicClient = usePublicClient();
        const ref = useRef<HTMLDivElement | null>(null);
        const lastSubPatchClick = useRef(0);
        const inputRef = useRef<HTMLInputElement | null>(null);
        const [selected, setSelected] = useState(0);
        const { fetchSubPatchForDoc } = useStorage();

        const { isCustomView, newObjectNode, setPatch } = usePatch();
        const [editing, setEditing] = useState(objectNode.text === "");
        const [error, setError] = useState<string | null>(null);
        const [text, setText] = useState(objectNode.subpatch ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen") : objectNode.text);
        const [parsedText, setParsedText] = useState("");
        const { expandPatch, patches, setPatches } = usePatches();
        const [includeInPresentation, setIncludeInPresentation] = useState(objectNode.attributes["Include in Presentation"]);

        const _expandPatch = useCallback(() => {
            if (objectNode.subpatch) {
                expandPatch(objectNode);
            }
        }, [objectNode]);

        const { setAutoCompletes, autoCompletes } = useAutoComplete(text, objectNode, editing);

        let objectNodes = objectNode.subpatch ? objectNode.subpatch.objectNodes : undefined;
        let messageNodes = objectNode.subpatch ? objectNode.subpatch.messageNodes : undefined;


        const onChange = useCallback((value: string) => {
            setText(value);
            setSelected(0);
        }, [setText, setSelected, objectNode]);

        const enterText = useCallback(async (text: string, context?: OperatorContext, id?: string) => {
            if (!context) {
                context = getOperatorContext(OperatorContextType.ZEN);
            }
            let success = true
            if (id) {
                let serializedSubPatch = await fetchSubPatchForDoc(id);
                if (serializedSubPatch) {
                    success = objectNode.parse(text, context.type, true, serializedSubPatch);
                } else {
                    success = false;
                }
            } else {
                success = objectNode.parse(text, context.type);
            }
            if (success) {
                // this object existed and successfully
                setError(null);
                setEditing(false);
                setParsedText(text);
            } else {
                // no definition
                setError("function not found");
            }
        }, [setEditing, setError, setParsedText]);

        const onKeyDown = useCallback((e: any) => {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected(Math.max(0, selected - 1));
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected(Math.max(0, selected + 1) % autoCompletes.length);
            }
            if (e.key === "Enter") {
                e.preventDefault();
                if (autoCompletes[selected]) {
                    let name = autoCompletes[selected].definition.name as string;
                    if (text.split(" ")[0] === name) {
                        name = text;
                    }
                    setText(name);
                    setAutoCompletes([]);
                    if (objectNode.text.split(" ")[0] === name) {
                        name = objectNode.text;
                    }

                    if (objectNode.text.split(" ")[0] === name) {
                        name = objectNode.text;
                    }
                    enterText(name, autoCompletes[selected].context, autoCompletes[selected].definition.id);
                } else {
                    enterText(text);
                }
                return;
            }
            if (e.key === "Tab") {
                if (autoCompletes[0]) {
                    e.preventDefault();

                    let name = autoCompletes[0].definition.name as string;
                    if (objectNode.text.split(" ")[0] === name) {
                        name = objectNode.text;
                    }
                    setText(name);
                    setAutoCompletes([]);
                }
            }
        }, [text, selected, setAutoCompletes, autoCompletes, setText, objectNode, setError, setEditing, setParsedText]);

        const togglePresentation = useCallback(() => {
            objectNode.setAttribute("Include in Presentation", !objectNode.attributes["Include in Presentation"]);
            setIncludeInPresentation(!includeInPresentation);
            objectNode.presentationPosition = { ...objectNode.position };
        }, [setIncludeInPresentation, includeInPresentation]);

        const duplicate = useCallback(() => {
            let copied = new ObjectNodeImpl(objectNode.patch);
            if (objectNode.name === "zen") {
                copied.parse("zen");
                let json = objectNode.getJSON();
                if (copied.subpatch && json.subpatch) {
                    copied.subpatch.fromJSON(
                        json.subpatch,
                        true);
                }
                copied.attributes = {
                    ...copied.attributes,
                    ...json.attributes
                };
                copied.size = json.size;
            } else {
                let size = objectNode.size;
                copied.parse(objectNode.text, objectNode.operatorContextType, false);
                if (size) {
                    copied.size = { ...size };
                }
            }
            copied.position.x = objectNode.position.x + sizeIndexRef.current[objectNode.id].width + 15;
            copied.position.y = objectNode.position.y;
            newObjectNode(copied, copied.position);
            updatePosition(copied.id, copied.position);

        }, [objectNode, newObjectNode]);

        useEffect(() => {
            // TODO: dont set timeout... this is a hack
            setTimeout(() => {
                if (inputRef.current && editing) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 10)
        }, [editing]);

        const initialPosition = useRef<Coordinate | null>(null);

        const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            setSelection(null);
            if (isCustomView) {
                // e.stopPropagation();
                return;
            }
            if (lockedModeRef.current) {
                return;
            }
            if (e.button === 2) {
                return;
            }
            if (editing) {
                e.stopPropagation();
            }
            if (isSelected || objectNode.text === "") {
                if (objectNode.text === "" || (initialPosition.current &&
                    initialPosition.current.x === objectNode.position.x &&
                    initialPosition.current.y === objectNode.position.y)) {
                    if (objectNode.text === "") {
                        e.stopPropagation();
                    }
                    if (objectNode.name === "zen" && objectNode.subpatch) {
                        let diff = new Date().getTime() - lastSubPatchClick.current;
                        lastSubPatchClick.current = new Date().getTime();
                        expandPatch(objectNode);
                        if (diff > 250) {
                            return;
                        }
                        return;
                    }
                    if (!objectNode.name || !index[objectNode.name]) {
                        setEditing(true);
                    }
                    setSelectedNodes([]);
                }
            } else {
                setSelectedNodes([objectNode]);
            }

            if (editing) {
                e.stopPropagation();
            }
            if (!editing) {
                let divRect = ref.current?.getBoundingClientRect();
                if (divRect) {
                    let x = e.clientX - divRect.left;
                    let y = e.clientY - divRect.top
                    initialPosition.current = { ...objectNode.position };
                }
            }
        }, [editing, objectNode, isSelected, setSelectedNodes, setEditing, setPatch, setPatches, patches]);

        let CustomComponent = (objectNode.name ? index[objectNode.name] : undefined) as unknown as React.ComponentType<NodeProps>;
        let isCustomSubPatchView = objectNode.attributes["Custom Presentation"];

        return (
            <PositionedComponent
                isCustomView={isCustomView}
                text={parsedText}
                lockedModeRef={lockedModeRef}
                isError={(typeError && !(typeError as TypeSuccess).success) || (error !== null)}
                skipOverflow={(error !== null || (typeError && !(typeError as TypeSuccess).success)) || (editing && autoCompletes.length > 0)}
                node={objectNode}>
                <ContextMenu.Root>
                    <ContextMenu.Content
                        onMouseDown={(e: any) => e.stopPropagation()}
                        style={{ zIndex: 10000000000000 }}
                        color="indigo" className="object-context rounded-lg p-2 text-xs">
                        {objectNode.name === "zen" && <ContextMenu.Item
                            onClick={_expandPatch}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            Expand Patch
                        </ContextMenu.Item>}
                        <ContextMenu.Item
                            onClick={togglePresentation}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            {!objectNode.attributes["Include in Presentation"] ? "Include in Presentation" : "Remove from Presentation"}
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={duplicate}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            Duplicate
                        </ContextMenu.Item>

                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        disabled={isCustomView}
                        className="ContextMenuTrigger relative">
                        <div
                            ref={ref}
                            onMouseDown={onMouseDown}
                            className="flex h-full w-full flex-1 whitespace-nowrap">
                            <>

                                {isCustomSubPatchView ? <CustomSubPatchView
                                    objectNode={objectNode} /> : CustomComponent ? <CustomComponent objectNode={objectNode} />
                                    : editing ?
                                        <input
                                            onClick={(e: any) => e.stopPropagation()}
                                            ref={inputRef}
                                            onKeyDown={onKeyDown}
                                            style={{
                                                width: Math.max(sizeIndexRef.current[objectNode.id] ?
                                                    sizeIndexRef.current[objectNode.id].width : 0,
                                                    text.length === 0 ? 36 : (Math.max(8, text.length) * 8))
                                            }}
                                            value={text}
                                            onChange={(e: any) => onChange(e.target.value)}
                                            type="text"
                                            className="text-zinc-100 w-full px-1 h-4 outline-none m-auto bg-dark-transparent" />
                                        :
                                        <div
                                            className="m-auto px-1 h-4 w-full text-zinc-100 bg-dark-transparent">{text}</div>
                                }
                                {editing && <AutoCompletes
                                    setAutoCompletes={setAutoCompletes}
                                    selected={selected}
                                    autoCompletes={autoCompletes}
                                    selectOption={(x: ContextDefinition) => {

                                        let name = x.definition.name as string;
                                        if (text.split(" ")[0] === name) {
                                            name = text;
                                        }
                                        setText(name);
                                        enterText(name, x.context, x.definition.id);
                                        setAutoCompletes([]);
                                    }} />}
                                {((typeError && !(typeError as TypeSuccess).success) || editing && (error)) &&
                                    <div
                                        style={{ left: "0px", bottom: "-20px" }}
                                        className="absolute bg-red-500 text-white rounded-lg px-2">
                                        {typeError ? (typeError as TypeError).error : error}
                                    </div>}
                            </>
                        </div>
                    </ContextMenu.Trigger>
                </ContextMenu.Root>

            </PositionedComponent>);
    };

export default ObjectNodeComponent;
