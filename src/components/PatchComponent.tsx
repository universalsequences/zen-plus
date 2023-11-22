import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import Toolbar from './Toolbar'
import Cables from './Cables';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import ObjectNodeComponent from './ObjectNodeComponent';
import { ObjectNode, Patch, IOConnection } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import { Connections, usePatch } from '@/contexts/PatchContext';
import { usePosition, DraggingNode, Coordinates } from '@/contexts/PositionContext';

interface Selection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const PatchComponent: React.FC<{ index: number }> = ({ index }) => {
    useThemeContext();
    const { selectedNodes, setSelectedNodes, setSelectedConnection } = useSelection();
    const {
        scrollRef,
        setDraggingNode, draggingNode, updatePosition, updatePositions, size } = usePosition();
    const {
        updateConnections,
        patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

    useKeyBindings();

    const lastClick = useRef(0);


    const [selection, setSelection] = useState<Selection | null>(null);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (selection) {
            let filtered = objectNodes.filter(
                node => node.position.x >= selection.x1 && node.position.x <= selection.x2 &&
                    node.position.y >= selection.y1 && node.position.y <= selection.y2);
            setSelectedNodes(filtered);
        }
        setDraggingNode(null);
    }, [setDraggingNode, selection, setSelection, setSelectedNodes, objectNodes]);
    const draggingNodeRef = useRef<DraggingNode | null>(null);

    useEffect(() => {
        draggingNodeRef.current = draggingNode;
    }, [draggingNode]);

    const selectedNodesRef = useRef(selectedNodes);

    useEffect(() => {
        selectedNodesRef.current = selectedNodes;
    }, [selectedNodes])

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!scrollRef.current) {
            return;
        }

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (selection) {
            let x = scrollRef.current.scrollLeft + client.x;
            let y = scrollRef.current.scrollTop + client.y
            setSelection({
                ...selection,
                x2: x,
                y2: y
            })
        }

        if (draggingNodeRef.current) {
            let { node, offset } = draggingNodeRef.current;
            let x = scrollRef.current.scrollLeft + client.x - offset.x;
            let y = scrollRef.current.scrollTop + client.y - offset.y;

            let diffX = x - node.position.x;
            let diffY = y - node.position.y;

            node.position.x = Math.max(0, x);
            node.position.y = Math.max(0, y);

            let updates: any = {};
            let nodeMap: any = {};
            for (let _node of selectedNodesRef.current) {
                if (node !== _node) {
                    _node.position.x = Math.max(0, _node.position.x + diffX);
                    _node.position.y = Math.max(0, _node.position.y + diffY);
                    updates[_node.id] = { ..._node.position };
                }
                nodeMap[_node.id] = _node;
            }
            updates[node.id] = { ...node.position };

            let _updates = updatePositions(updates);
            for (let id in updates) {
                let node = nodeMap[id];
                if (node) {
                    node.position = updates[id];
                }
            }
        }
    }, [updatePositions, scrollRef, selection, setSelection, selectedNodes]);

    useEffect(() => {
        if (patch.objectNodes.length < 1) {
            let node = new ObjectNodeImpl(patch);
            node.parse("out 1");
            let position = { x: window.innerWidth / 2, y: window.innerHeight - 300 };
            newObjectNode(node, position);
            updatePosition(node.id, position);
        }
    }, [objectNodes]);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
        }
    }, [updatePositions, scrollRef, selection, setSelection, selectedNodes]);


    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (scrollRef.current) {

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            let x = scrollRef.current.scrollLeft + client.x
            let y = scrollRef.current.scrollTop + client.y
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
        if (now - lastClick.current < 350 && scrollRef.current) {
            // create a new object

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            let x = scrollRef.current.scrollLeft + client.x;
            let y = scrollRef.current.scrollTop + client.y

            let objectNode = new ObjectNodeImpl(patch);
            let position = {
                x, y
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
    }, [setSelectedNodes, selection, setSelectedConnection, setSelection, patch]);

    useEffect(() => {
        let positions: Coordinates = {};
        let connections: Connections = {};
        for (let node of patch.objectNodes) {
            positions[node.id] = node.position;
            let _connections: IOConnection[] = [];
            for (let outlet of node.outlets) {
                _connections = [..._connections, ...outlet.connections];
            }
            connections[node.id] = _connections;
        }
        updatePositions(positions);
        updateConnections(connections);
    }, [patch]);

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
        updatePosition(objectNode.id, { ...menuPositionRef.current });
    }, [menuPosition, objectNodes]);

    const createMessageNode = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch);
        newMessageNode(messageNode, { ...menuPosition });
    }, [menuPosition]);

    let out = React.useMemo(() => {
        return (
            <div
                onContextMenu={handleContextMenu}
                className={"flex flex-col border border-zinc-600 relative w-full my-5 tile "}>
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
                        className="ContextMenuTrigger overflow-scroll relative">
                        <div
                            onMouseDown={onMouseDown}
                            onClick={onClick}
                            className=" flex flex-1 select-none bg-black-blur z-1">
                            <Cables />
                            {selection &&
                                <div
                                    style={{
                                        left: selection.x1 + 'px', top: selection.y1 + 'px',
                                        width: (selection.x2 - selection.x1) + 'px', height: (selection.y2 - selection.y1) + 'px'
                                    }}
                                    className="bg-red-500 absolute pointer-events-none z-1 opacity-50 border-zinc-100 border" />}
                            {objectNodes.map(
                                (objectNode, index) =>
                                    objectNode.name === "outputs" ? '' : <ObjectNodeComponent
                                        key={objectNode.id}
                                        objectNode={objectNode} />
                            )}
                        </div>
                    </ContextMenu.Trigger>
                </ContextMenu.Root>
                <Toolbar />
            </div>
        );
    }, [objectNodes, messageNodes, selection, patch]);
    return out;
};

export default PatchComponent;
