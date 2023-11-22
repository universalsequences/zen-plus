import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePosition, DraggingNode } from '@/contexts/PositionContext';
import { usePatches } from '@/contexts/PatchesContext';
import PositionedComponent from './PositionedComponent';
import { lookupDoc } from '@/lib/nodes/definitions/doc';
import { Definition } from '@/lib/docs/docs';
import { ObjectNode, Patch, Coordinate, MessageNode } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';

import { usePatch } from '@/contexts/PatchContext';
import { usePositionStyle } from '@/hooks/usePositionStyle';
import { nodeServerAppPaths } from 'next/dist/build/webpack/plugins/pages-manifest-plugin';

const ObjectNodeComponent: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const { selectedNodes, setSelectedNodes } = useSelection();
    const { setDraggingNode } = usePosition();
    let isSelected = selectedNodes.includes(objectNode);
    let out = React.useMemo(() => {
        return <InnerObjectNodeComponent
            objectNode={objectNode}
            setSelectedNodes={setSelectedNodes}
            setDraggingNode={setDraggingNode}
            isSelected={isSelected}
        />
    }, [objectNode, setSelectedNodes, setDraggingNode, isSelected]);

    return out;
};

const InnerObjectNodeComponent: React.FC<{
    isSelected: boolean,
    setDraggingNode: (x: DraggingNode | null) => void,
    setSelectedNodes: (x: (ObjectNode | MessageNode)[]) => void,
    objectNode: ObjectNode
}> =
    ({
        isSelected,
        setDraggingNode,
        objectNode,
        setSelectedNodes,
    }) => {
        const ref = useRef<HTMLDivElement | null>(null);
        const inputRef = useRef<HTMLInputElement | null>(null);

        const { setPatch } = usePatch();
        const [editing, setEditing] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [text, setText] = useState(objectNode.subpatch ? objectNode.text.replace("zen", objectNode.subpatch.name || "zen") : objectNode.text);
        const { patches, setPatches } = usePatches();


        const onChange = useCallback((value: string) => {
            setText(value);
        }, [setText, objectNode]);

        const onKeyDown = useCallback((e: any) => {
            if (e.key === "Enter") {
                let success = objectNode.parse(text);
                if (success) {
                    // this object existed and successfully
                    setError(null);
                    setEditing(false);
                } else {
                    // no definition
                    setError("function not found");
                }
            }
        }, [text, setText, objectNode, setError, setEditing]);

        useEffect(() => {
            // TODO: dont set timeout... this is a hack
            setTimeout(() => {
                if (inputRef.current && editing) {
                    inputRef.current.focus();
                    inputRef.current.select();
                }
            }, 100)
        }, [editing]);

        const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {

        }, [isSelected, objectNode, setSelectedNodes, setEditing, editing]);

        const initialPosition = useRef<Coordinate | null>(null);

        const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
                    setEditing(true);
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
        }, [editing, setDraggingNode, objectNode, isSelected, setSelectedNodes, setEditing, setPatch, setPatches, patches]);

        return (
            <PositionedComponent
                node={objectNode}>
                <div
                    ref={ref}
                    onMouseDown={onMouseDown}
                    className="flex h-full w-full flex-1 whitespace-nowrap">
                    {editing ?
                        <input
                            onClick={(e: any) => e.stopPropagation()}
                            ref={inputRef}
                            onKeyDown={onKeyDown}
                            value={text}
                            onChange={(e: any) => onChange(e.target.value)}
                            type="text"
                            className="text-zinc-100 px-1 h-4 w-full outline-none m-auto bg-zinc-800" />
                        :
                        <div
                            onClick={onClick}
                            className="m-auto px-1 h-4 w-full text-zinc-100 bg-zinc-800">{text}</div>
                    }
                    {editing && error &&
                        <div
                            style={{ left: "0px", bottom: "-20px" }}
                            className="absolute bg-red-500 text-white rounded-lg px-2">
                            {error}
                        </div>}
                </div>
            </PositionedComponent>);
    };

export default ObjectNodeComponent;
