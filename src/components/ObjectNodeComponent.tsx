import React, { useRef, useState, useEffect, useCallback } from 'react';
import { OperatorContext, OperatorContextType, getAllContexts, getOperatorContext } from '@/lib/nodes/context';
import { ContextDefinition } from '@/hooks/useAutoComplete';
import AutoCompletes from './AutoCompletes';
import { index } from './ux/index';
import Attributes from './Attributes';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { SizeIndex, usePosition, DraggingNode } from '@/contexts/PositionContext';
import { usePatches } from '@/contexts/PatchesContext';
import PositionedComponent from './PositionedComponent';
import { ObjectNode, Patch, Coordinate, Size, MessageNode } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { usePatch } from '@/contexts/PatchContext';

const ObjectNodeComponent: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const { lockedMode, selectedNodes, setSelectedNodes } = useSelection();
    const { sizeIndexRef } = usePosition();

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
            setSelectedNodes={setSelectedNodes}
            isSelected={isSelected}
        />
    }, [objectNode, setSelectedNodes, isSelected]);

    return out;
};

const InnerObjectNodeComponent: React.FC<{
    isSelected: boolean,
    lockedModeRef: React.MutableRefObject<boolean>,
    sizeIndexRef: React.MutableRefObject<SizeIndex>,
    setSelectedNodes: (x: (ObjectNode | MessageNode)[]) => void,
    objectNode: ObjectNode
}> =
    ({
        lockedModeRef,
        sizeIndexRef,
        isSelected,
        objectNode,
        setSelectedNodes,
    }) => {
        const ref = useRef<HTMLDivElement | null>(null);
        const inputRef = useRef<HTMLInputElement | null>(null);
        const [selected, setSelected] = useState(0);

        const { setPatch } = usePatch();
        const [editing, setEditing] = useState(objectNode.text === "");
        const [error, setError] = useState<string | null>(null);
        const [text, setText] = useState(objectNode.subpatch ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen") : objectNode.text);
        const [parsedText, setParsedText] = useState("");
        const { patches, setPatches } = usePatches();

        const { setAutoCompletes, autoCompletes } = useAutoComplete(text);

        const onChange = useCallback((value: string) => {
            setText(value);
            setSelected(0);
        }, [setText, setSelected, objectNode]);

        const enterText = useCallback((text: string, context?: OperatorContext) => {
            if (!context) {
                context = getOperatorContext(OperatorContextType.ZEN);
            }
            let success = objectNode.parse(text, context.type);
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
                console.log("enter");
                if (autoCompletes[selected]) {
                    console.log('auto completes...');
                    let name = autoCompletes[selected].definition.name as string;
                    if (text.split(" ")[0] === name) {
                        name = text;
                    }
                    setText(name);
                    setAutoCompletes([]);
                    enterText(name, autoCompletes[selected].context);
                } else {
                    console.log("else enter text=", text);
                    enterText(text);
                }
                return;
            }
            if (e.key === "Tab") {
                if (autoCompletes[0]) {
                    e.preventDefault();
                    setText(autoCompletes[0].definition.name as string);
                    setAutoCompletes([]);
                }
            }
        }, [text, selected, setAutoCompletes, autoCompletes, setText, objectNode, setError, setEditing, setParsedText]);

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
                        if (!patches.includes(objectNode.subpatch)) {
                            setPatches([...patches, objectNode.subpatch]);
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

        let CustomComponent = objectNode.name ? index[objectNode.name] : undefined;

        return (
            <PositionedComponent
                text={parsedText}
                lockedModeRef={lockedModeRef}
                skipOverflow={error !== null || (editing && autoCompletes.length > 0)}
                node={objectNode}>
                <ContextMenu.Root>
                    <ContextMenu.Content
                        style={{ zIndex: 10000000000000 }}
                        color="indigo" className="object-context rounded-lg">
                        <Attributes node={objectNode} />
                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        className="ContextMenuTrigger relative">
                        <div
                            ref={ref}
                            onMouseDown={onMouseDown}
                            className="flex h-full w-full flex-1 whitespace-nowrap">
                            <>

                                {CustomComponent ? <CustomComponent objectNode={objectNode} />
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
                                            className="text-zinc-100 w-full px-1 h-4 outline-none m-auto bg-zinc-800" />
                                        :
                                        <div
                                            className="m-auto px-1 h-4 w-full text-zinc-100 bg-zinc-800">{text}</div>
                                }
                                {editing && <AutoCompletes
                                    setAutoCompletes={setAutoCompletes}
                                    selected={selected}
                                    autoCompletes={autoCompletes}
                                    selectOption={(x: ContextDefinition) => {
                                        setText(x.definition.name as string);
                                        enterText(x.definition.name as string, x.context);
                                        setAutoCompletes([]);
                                    }} />}
                                {editing && error &&
                                    <div
                                        style={{ left: "0px", bottom: "-20px" }}
                                        className="absolute bg-red-500 text-white rounded-lg px-2">
                                        {error}
                                    </div>}
                            </>
                        </div>
                    </ContextMenu.Trigger>
                </ContextMenu.Root>

            </PositionedComponent>);
    };

export default ObjectNodeComponent;
