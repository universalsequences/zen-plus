import React, { useRef, useState, useEffect, useCallback } from 'react';
import LockButton from './LockButton';
import { useMessage } from '@/contexts/MessageContext';
import { traverseBackwards } from '@/lib/nodes/traverse';
import { useSelection } from '@/contexts/SelectionContext';
import Toolbar from './Toolbar'
import Cables from './Cables';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { useKeyBindings } from '@/hooks/useKeyBindings';
import ObjectNodeComponent from './ObjectNodeComponent';
import { MessageType, Orientation, Coordinate, IOConnection } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import MessageNodeComponent from './MessageNodeComponent';
import { Connections, usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import { usePosition, ResizingNode, DraggingNode, Coordinates } from '@/contexts/PositionContext';

enum PatchResizeType {
    Left,
    Right,
}

interface ResizingPatch {
    gridTemplate: string;
    resizeType: PatchResizeType
    startPosition: Coordinate;
}


interface Selection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const PatchComponent: React.FC<{ index: number }> = ({ index }) => {
    useThemeContext();
    const { setGridTemplate, gridTemplate } = usePatches();
    const [resizingPatch, setResizingPatch] = useState<ResizingPatch | null>(null);
    const {
        lastResizingTime,
        setSelection,
        selection,
        lockedMode,
        selectedNodes, setSelectedNodes, setSelectedConnection } = useSelection();
    const { onNewMessage } = useMessage();

    useEffect(() => {
    }, []);

    const {
        updateSize,
        scrollRef,
        setResizingNode,
        resizingNode,
        setDraggingNode,
        draggingNode,
        sizeIndexRef,
        updatePosition,
        updatePositions,
        setDraggingSegmentation,
        draggingSegmentation,
    } = usePosition();

    const {
        segmentCable,
        segmentCables,
        updateConnections,
        patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

    useEffect(() => {
        patch.onNewMessage = onNewMessage;
    }, [patch, onNewMessage]);

    useKeyBindings();

    const lastClick = useRef(0);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (lockedMode) {
            return;
        }
        setDraggingSegmentation(null);
        if (resizingPatch) {
            setResizingPatch(null);
        }
        if (selection && selection.patch === patch) {
            let filtered = [...objectNodes, ...messageNodes].filter(
                node => {
                    let size = sizeIndexRef.current[node.id];
                    if (size) {
                        let w = size.width || 100;
                        let h = size.height || 7;
                        return node.position.x + w >= selection.x1 && node.position.x <= selection.x2 &&
                            node.position.y + h >= selection.y1 && node.position.y <= selection.y2;
                    } else {
                        return;
                    }
                });
            console.log("on mouse up selection =", filtered, selection);
            setSelectedNodes(filtered);
        }
        setDraggingNode(null);
        setResizingNode(null);
    }, [resizingPatch, setResizingPatch, setDraggingSegmentation, setDraggingNode, setResizingNode, selection, setSelection, setSelectedNodes, messageNodes, objectNodes, lockedMode]);

    const draggingNodeRef = useRef<DraggingNode | null>(null);
    const resizingNodeRef = useRef<ResizingNode | null>(null);

    useEffect(() => {
        draggingNodeRef.current = draggingNode;
        resizingNodeRef.current = resizingNode;
    }, [resizingNode, draggingNode]);

    const selectedNodesRef = useRef(selectedNodes);

    useEffect(() => {
        selectedNodesRef.current = selectedNodes;
        let node = selectedNodes[0];
        //if (node) {
        //    let backwards = traverseBackwards(node);
        //}
    }, [selectedNodes])

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!scrollRef.current) {
            return;
        }
        if (resizingPatch) {
            let diffX = e.pageX - resizingPatch.startPosition.x;
            let tokens = resizingPatch.gridTemplate.split(" ");
            let token = tokens[index].replace("fr", "");
            let tokenNum = parseFloat(token);
            let pageWidth = window.innerWidth;
            let ratio = diffX / pageWidth;
            let newToken = tokenNum - ratio * 3;
            setGridTemplate("1fr " + newToken + "fr");
        }
        if (lockedMode) {
            return;
        }

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (draggingSegmentation) {
            let y = scrollRef.current.scrollTop + client.y; //- offset.y;
            let id = draggingSegmentation.source.id;
            segmentCable(draggingSegmentation, y - sizeIndexRef.current[id].height);
        }
        if (resizingNodeRef.current) {
            lastResizingTime.current = new Date().getTime();
            if (resizingNodeRef.current.orientation === Orientation.X) {
                let { node, offset } = resizingNodeRef.current;
                let x = scrollRef.current.scrollLeft + client.x;// - offset.x;
                let y = scrollRef.current.scrollTop + client.y; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let width = x - node.position.x;
                node.size.width = width;
                updateSize(node.id, { ...node.size });
            } else if (resizingNodeRef.current.orientation === Orientation.Y) {
                let { node, offset } = resizingNodeRef.current;
                let x = scrollRef.current.scrollLeft + client.x;// - offset.x;
                let y = scrollRef.current.scrollTop + client.y; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let height = y - node.position.y;
                node.size.height = height;
                updateSize(node.id, { ...node.size });
            } else {
                let { node, offset } = resizingNodeRef.current;
                let x = scrollRef.current.scrollLeft + client.x;// - offset.x;
                let y = scrollRef.current.scrollTop + client.y; //- offset.y;
                if (!node.size) {
                    node.size = sizeIndexRef.current[node.id];
                    // position`
                }
                let height = y - node.position.y;
                let width = x - node.position.x;
                node.size.height = height;
                node.size.width = width;
                updateSize(node.id, { ...node.size });
            }
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
    }, [
        draggingSegmentation,
        resizingPatch,
        setGridTemplate,
        updatePositions, scrollRef, selection, setSelection, selectedNodes, updateSize, lockedMode]);

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
        if (lockedMode) {
            setDraggingNode(null);
            setSelectedNodes([]);
        }
    }, [lockedMode, setSelectedNodes, setDraggingNode]);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }
    }, [
        draggingSegmentation,
        setDraggingSegmentation,
        resizingPatch,
        setResizingPatch,
        setGridTemplate,
        lockedMode,
        objectNodes,
        messageNodes,
        updatePositions, scrollRef, selection, setSelection, updateSize, selectedNodes, resizingNode, setResizingNode]);


    const onSelectionMove = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
                patch: patch,
                x2: x,
                y2: y
            })
        }
    }, [setSelection, selection]);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (e.button === 2) {
            return;
        }
        if (scrollRef.current) {

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            let x = scrollRef.current.scrollLeft + client.x
            let y = scrollRef.current.scrollTop + client.y
            setSelection({
                patch: patch,
                x1: x,
                y1: y,
                x2: x,
                y2: y
            })
        }
    }, [setSelection]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (e.button == 2) {
            return;
        }
        let now = new Date().getTime();
        if (now - lastResizingTime.current < 200) {
            return;
        }
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

    const createNumberBox = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch, MessageType.Number);
        newMessageNode(messageNode, { ...menuPositionRef.current });
        updatePosition(messageNode.id, { ...menuPositionRef.current });
    }, [menuPosition, messageNodes]);

    const createMessageNode = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch, MessageType.Message);
        newMessageNode(messageNode, { ...menuPositionRef.current });
        updatePosition(messageNode.id, { ...menuPositionRef.current });
    }, [menuPosition, messageNodes]);


    let out = React.useMemo(() => {
        return (
            <div
                onContextMenu={handleContextMenu}
                className={("flex flex-col border border-zinc-600 relative w-full tile ") + (lockedMode ? "locked" : "")}>
                <div
                    onMouseDown={(e: any) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setResizingPatch({
                            startPosition: { x: e.pageX, y: e.pageY },
                            gridTemplate, resizeType: PatchResizeType.Right
                        });
                    }}
                    className="h-full w-1 absolute right-0 cursor-ew-resize z-30" />
                <div
                    onMouseDown={(e: any) => {

                        e.preventDefault();
                        e.stopPropagation();
                        setResizingPatch({
                            startPosition: { x: e.pageX, y: e.pageY },
                            gridTemplate, resizeType: PatchResizeType.Left
                        })
                    }}
                    className="h-full w-1 absolute left-0 cursor-ew-resize z-30" />

                <ContextMenu.Root>
                    <ContextMenu.Content color="indigo" className="object-context p-2 rounded-md text-white text-xs">
                        <ContextMenu.Item
                            onClick={createObjectNode}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            New Object Node
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={createMessageNode}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            New Message Node
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={createNumberBox}
                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            New Number Box
                        </ContextMenu.Item>
                        <ContextMenu.Item
                            onClick={() => segmentCables(sizeIndexRef.current)}

                            className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                            Segment All Cables
                        </ContextMenu.Item>
                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        ref={scrollRef}
                        className="ContextMenuTrigger overflow-scroll relative">
                        <div
                            onMouseMove={onSelectionMove}
                            onMouseDown={onMouseDown}
                            onClick={onClick}
                            className=" flex flex-1 select-none patcher-background z-1">
                            <Cables />
                            {selection && selection.patch === patch &&
                                <div
                                    style={{
                                        left: selection.x1 + 'px', top: selection.y1 + 'px',
                                        width: (selection.x2 - selection.x1) + 'px', height: (selection.y2 - selection.y1) + 'px'
                                    }}
                                    className="bg-red-500 absolute pointer-events-none z-1 opacity-50 border-zinc-100 border" />}
                            {objectNodes.map(
                                (objectNode, index) =>
                                    objectNode.name === "outputs" ? '' : <ObjectNodeComponent
                                        key={objectNode.id + '_' + index}
                                        objectNode={objectNode} />
                            )}
                            {messageNodes.map(
                                (messageNode, index) =>
                                    <MessageNodeComponent
                                        key={messageNode.id + '_' + index}
                                        messageNode={messageNode} />
                            )}
                        </div>
                    </ContextMenu.Trigger>
                </ContextMenu.Root>
                <Toolbar />
                <LockButton />
            </div>
        );
    }, [objectNodes, messageNodes, selection, patch, lockedMode]);
    return out;
};

export default PatchComponent;
