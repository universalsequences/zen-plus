import React, { useRef, useState, useEffect, useCallback } from 'react';
import Cables from './Cables';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import ObjectNodeComponent from './ObjectNodeComponent';
import { ObjectNode, Patch } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import { usePatch } from '@/contexts/PatchContext';
import { usePosition, DraggingNode } from '@/contexts/PositionContext';

interface Selection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const PatchComponent = () => {
    useThemeContext();
    const { setDraggingNode, draggingNode, selectedNodes, setSelectedNodes, updatePosition, updatePositions, size, setSelectedConnection } = usePosition();
    const { patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

    useKeyBindings();

    const lastClick = useRef(0);

    const scrollRef = useRef<HTMLDivElement | null>(null);

    const [selection, setSelection] = useState<Selection | null>(null);

    const onMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (selection) {
            let filtered = objectNodes.filter(
                node => node.position.x >= selection.x1 && node.position.x <= selection.x2 && 
                node.position.y >= selection.y1 && node.position.y <= selection.y2);
            console.log('filtered for selection', filtered, selection)
            setSelectedNodes(filtered);
        }
        setDraggingNode(null);
    }, [setDraggingNode, selection, setSelection, setSelectedNodes, objectNodes]);
    console.log(selection);
    const draggingNodeRef = useRef<DraggingNode | null>(null);

    useEffect(() => {
        draggingNodeRef.current = draggingNode;
    }, [draggingNode]);

    const selectedNodesRef = useRef(selectedNodes);

    useEffect(() => {
        selectedNodesRef.current = selectedNodes;
    }, [selectedNodes])
    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!scrollRef.current) {
            return;
        }
        if (selection) {
            let x = scrollRef.current.scrollLeft + e.pageX 
            let y = scrollRef.current.scrollTop + e.pageY
            setSelection({
                ... selection,
                x2: x,
                y2: y
            })
        }
        if (draggingNodeRef.current) {
            let { node, offset, origin } = draggingNodeRef.current;
            let x = scrollRef.current.scrollLeft + e.pageX - offset.x;
            let y = scrollRef.current.scrollTop + e.pageY - offset.y;

            let diffX = x - node.position.x;
            let diffY = y - node.position.y;
            node.position.x = x;
            node.position.y = y;

            let updates: any = {};
            for (let _node of selectedNodesRef.current) {
                if (node !== _node) {
                    _node.position.x += diffX;
                    _node.position.y += diffY;
                    updates[_node.id] = {... _node.position};
                }
            }
            updates[node.id] = {... node.position};
            updatePositions(updates);
            //updatePosition(node.id, { ...node.position });
        }
    }, [updatePositions, scrollRef, selection, setSelection, selectedNodes]);

    useEffect(() => {
        if (patch.objectNodes.length < 1) {
            let node = new ObjectNodeImpl(patch);
            node.parse("out 1");
            let position = { x: window.innerWidth / 2, y: window.innerHeight - 100 };
            newObjectNode(node, position);
            updatePosition(node.id, position);
        }
    }, [objectNodes]);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (scrollRef.current) {
            let x = scrollRef.current.scrollLeft + e.pageX 
            let y = scrollRef.current.scrollTop + e.pageY
            setSelection({
                x1: x,
                y1: y,
                x2: x,
                y2: y
            })
    }
    }, [setSelection]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        let now = new Date().getTime();
        if (now - lastClick.current < 350) {
            // create a new object
            let objectNode = new ObjectNodeImpl(patch);
            let position = {
                x: e.pageX,
                y: e.pageY,
            };

            newObjectNode(objectNode, position);
            updatePosition(objectNode.id, position);
            setSelection(null);
        } else {
            if (selection == null || selection.x1 === selection.x2) {
                setSelectedNodes([]);
                setSelectedConnection(null);
            }
            setSelection(null);
        }
        lastClick.current = now;
    }, [setSelectedNodes, selection, setSelectedConnection, setSelection]);

    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const handleContextMenu = (event: any) => {
        event.preventDefault();
        setMenuPosition({ x: event.clientX, y: event.clientY });
    };

    const menuPositionRef = useRef(menuPosition);

    useEffect(() => {
        menuPositionRef.current = menuPosition;
    }, [menuPosition]);

    const createObjectNode = useCallback(() => {
        let objectNode = new ObjectNodeImpl(patch);
        newObjectNode(objectNode, { ...menuPositionRef.current });
        updatePosition(objectNode.id, {... menuPositionRef.current});
    }, [menuPosition, objectNodes]);

    const createMessageNode = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch);
        newMessageNode(messageNode, { ...menuPosition });
    }, [menuPosition]);


    let out = React.useMemo(() => {
        console.log('rendering patch component');
        return (
            <div
                onContextMenu={handleContextMenu}
                className="flex-1 flex min-h-screen flex-col">
                <ContextMenu.Root>
                    <ContextMenu.Content color="indigo" className="ContextMenuContent">
                        <ContextMenu.Item
                            onClick={createObjectNode}
                            className="ContextMenuItem">
                            New Object Node
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={createMessageNode}
                            className="ContextMenuItem">
                            New Message Node
                        </ContextMenu.Item>
                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        ref={scrollRef}
                        style={size ? { minWidth: size.width + 'px', minHeight: size.height + 'px' } : {}}
                        className="ContextMenuTrigger overflow-scroll relative">
                        <div
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onClick={onClick}
                            className="w-full h-full flex flex-1 select-none bg-zinc-700 z-1">
                            <Cables />
                            {selection && <div 
                            style={{left: selection.x1 + 'px', top: selection.y1 + 'px',
                        width: (selection.x2-selection.x1) + 'px', height: (selection.y2 - selection.y1) + 'px'}}
                            className="bg-red-500 absolute pointer-events-none"/>}
                            {objectNodes.map(
                                (objectNode, index) =>
                                    objectNode.name === "outputs" ? '' : <ObjectNodeComponent
                                        key={objectNode.id}
                                        objectNode={objectNode} />
                            )}
                        </div>

                    </ContextMenu.Trigger>
                </ContextMenu.Root>
            </div>
        );
    }, [objectNodes, messageNodes, selection]);
    return out;
};

export default PatchComponent;
