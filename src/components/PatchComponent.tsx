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
import { MessageNode, ObjectNode, Node, MessageType, Orientation, Coordinate, IOConnection } from '@/lib/nodes/types';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import MessageNodeComponent from './MessageNodeComponent';
import { Connections, usePatch } from '@/contexts/PatchContext';
import { usePatches } from '@/contexts/PatchesContext';
import { usePosition, ResizingNode, DraggingNode, Coordinates } from '@/contexts/PositionContext';
import PresentationMode from './PresentationMode';

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

const PatchComponent: React.FC<{ visibleObjectNodes?: ObjectNode[], messageNodes?: MessageNode[], index: number, isCustomView?: boolean }> = ({ visibleObjectNodes, index, isCustomView }) => {
    useThemeContext();
    const { setSelectedPatch, setGridTemplate, gridTemplate } = usePatches();
    const [resizingPatch, setResizingPatch] = useState<ResizingPatch | null>(null);
    const {
        lastResizingTime,
        setSelection,
        selection,
        lockedMode,
        selectedNodes, setSelectedNodes, setSelectedConnection } = useSelection();
    const { onNewMessage } = useMessage();

    useEffect(() => {
        if (!isCustomView) {
            setSelectedPatch(patch);
            patch.onNewMessage = onNewMessage;
        }
    }, [onNewMessage]);

    let {
        updateSize,
        scrollRef,
        setResizingNode,
        resizingNode,
        setDraggingNode,
        draggingNode,
        sizeIndexRef,
        updatePosition,
        presentationMode,
        updatePositions,
        setDraggingSegmentation,
        draggingSegmentation,
    } = usePosition();

    if (isCustomView) {
        presentationMode = true;
    }

    const {
        deleteNodes,
        segmentCable,
        segmentCables,
        updateConnections,
        registerConnection,
        patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

    useEffect(() => {
        patch.onNewMessage = onNewMessage;
    }, [patch, onNewMessage]);

    useKeyBindings();

    const lastClick = useRef(0);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (isCustomView) {
            return;
        }
        if (lockedMode) {
            return;
        }
        setDraggingSegmentation(null);
        if (resizingPatch) {
            setResizingPatch(null);
        }
        if (selection && selection.patch === patch) {
            let all = [...patch.objectNodes, ...patch.messageNodes];
            console.log("ALL =", all);
            let filtered = all.filter(
                node => {
                    let size = sizeIndexRef.current[node.id];
                    let w = size ? size.width || 100 : 100;
                    let h = size ? size.height || 7 : 7;
                    let position = presentationMode ? node.presentationPosition || node.position : node.position;
                    return position.x + w >= selection.x1 && position.x <= selection.x2 &&
                        position.y + h >= selection.y1 && position.y <= selection.y2;
                });
            setSelectedNodes(filtered);
        }
        setDraggingNode(null);
        setResizingNode(null);
    }, [presentationMode, resizingPatch, setResizingPatch, setDraggingSegmentation, setDraggingNode, setResizingNode, selection, setSelection, setSelectedNodes, messageNodes, objectNodes, lockedMode]);

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
        if (isCustomView) {
            return;
        }
        if (resizingPatch) {
            let pageWidth = window.innerWidth;
            let leftWidthPercent = (e.pageX / pageWidth) * 100;
            let rightWidthPercent = 100 - leftWidthPercent;

            // Create the grid template string
            let newGridTemplate = `${leftWidthPercent}% ${rightWidthPercent}%`;

            setGridTemplate(newGridTemplate);
        }
        if (lockedMode) {
            return;
        }

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        if (draggingSegmentation) {
            let y = scrollRef.current.scrollTop + client.y; //- offset.y;
            let id = draggingSegmentation.source.id;
            let node = draggingSegmentation.source as ObjectNode;
            let height = node.size ? node.size.height : sizeIndexRef.current[id].height;
            if (height) {
                segmentCable(draggingSegmentation, y - height);
            }
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

            let position = presentationMode ? node.presentationPosition || node.position : node.position;
            let diffX = x - position.x;
            let diffY = y - position.y;

            position.x = Math.max(0, x);
            position.y = Math.max(0, y);

            let updates: any = {};
            let nodeMap: any = {};

            for (let _node of selectedNodesRef.current) {
                if (selectedNodesRef.current.length > 1) {
                    for (let outlet of _node.outlets) {
                        for (let connection of outlet.connections) {
                            if (connection.segmentation) {
                                connection.segmentation += diffY;
                            }
                        }
                    }
                }
                if (node !== _node) {
                    let _position = presentationMode ? _node.presentationPosition || _node.position : _node.position;
                    _position.x = Math.max(0, _position.x + diffX);
                    _position.y = Math.max(0, _position.y + diffY);
                    updates[_node.id] = { ..._position };
                }
                nodeMap[_node.id] = _node;
            }
            updates[node.id] = { ...position };

            let _updates = updatePositions(updates);
            for (let id in updates) {
                let node = nodeMap[id];
                if (node) {
                    if (presentationMode) {
                        node.presentationPosition = updates[id];
                    } else {
                        node.position = updates[id];
                    }
                }
            }
        }
    }, [
        presentationMode,
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
        presentationMode,
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
        if (isCustomView) {
            return;
        }
        setSelectedPatch(patch);
        patch.onNewMessage = onNewMessage;
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
    }, [setSelection, onNewMessage]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isCustomView) {
            return;
        }
        setSelectedPatch(patch);
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
        for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
            if (presentationMode && !node.attributes["Include in Presentation"]) {
                continue;
            }
            positions[node.id] = presentationMode ? node.presentationPosition || node.position : node.position;
            let _connections: IOConnection[] = [];
            for (let outlet of node.outlets) {
                _connections = [..._connections, ...outlet.connections];
            }
            connections[node.id] = _connections;
        }
        updatePositions(positions);
        updateConnections(connections);
    }, [patch, presentationMode]);

    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const handleContextMenu = (event: any) => {
        if (isCustomView) {
            return;
        }
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
        return objectNode;
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

    const presentation = useCallback((nodes: Node[]) => {
        for (let node of nodes) {
            (node as ObjectNode).setAttribute("Include in Presentation", true);
            (node as ObjectNode).presentationPosition = { ... (node as ObjectNode).position };
        }
    }, []);

    const encapsulate = useCallback((nodes: Node[]) => {
        let inboundConnections = nodes.flatMap(
            node => node.inlets.flatMap(
                inlet => inlet.connections.filter(
                    connection => !nodes.includes(connection.source))));

        let outboundConnections = nodes.flatMap(
            node => node.outlets.flatMap(
                outlet => outlet.connections.filter(
                    connection => !nodes.includes(connection.destination))));

        let objectNode = createObjectNode();
        objectNode.parse("zen");
        patch.objectNodes = patch.objectNodes.filter(
            x => !nodes.includes(x));
        patch.messageNodes = patch.messageNodes.filter(
            x => !nodes.includes(x));

        let subpatch = objectNode.subpatch;
        if (!subpatch) {
            return;
        }

        subpatch.objectNodes.forEach(x => x.outlets.forEach(y => y.connections = []));
        subpatch.messageNodes.forEach(x => x.outlets.forEach(y => y.connections = []));
        subpatch.objectNodes = subpatch.objectNodes.filter(x => x.name !== "+");

        let inboundNodes = Array.from(new Set(inboundConnections.map(x => x.destination)));
        let outboundNodes = Array.from(new Set(outboundConnections.map(x => x.source)));

        for (let i = 0; i < inboundConnections.length; i++) {
            let node = inboundConnections[i].destination;
            let connection = inboundConnections[i];
            let inputNode: ObjectNode = new ObjectNodeImpl(subpatch);
            if (i >= 2) {
                let position = (node as ObjectNode).position;
                //newObjectNode(inputNode, { x: position.x, y: Math.max(0, position.y - 10) });
                subpatch.objectNodes.push(inputNode);
                inputNode.position = { x: position.x, y: Math.max(0, position.y - 30) };
                inputNode.parse('in ' + (i + 1));
            } else {
                let n = subpatch.objectNodes.find(x => x.text === ("in " + (i + 1)));
                if (!n) {
                    continue;
                }
                inputNode = n as ObjectNode;
            }
            for (let inlet of node.inlets) {
                inlet.connections.splice(inlet.connections.indexOf(connection), 1);
            }
            //for (let connection of inboundConnections) {
            //   if (connection.destination === node) {
            for (let _outlet of connection.source.outlets) {
                _outlet.connections = _outlet.connections.filter(
                    c => c !== connection);
            }
            let _connection = connection.source.connect(
                objectNode,
                objectNode.inlets[i], connection.sourceOutlet, false);
            registerConnection(connection.source.id, _connection);

            inputNode.connect(
                connection.destination,
                connection.destinationInlet,
                inputNode.outlets[0],
                false);
        }

        for (let i = 0; i < outboundConnections.length; i++) {
            let node = outboundConnections[i].source;
            let connection = outboundConnections[i];
            let outputNode: ObjectNode = new ObjectNodeImpl(subpatch);
            if (i >= 1) {
                let position = (node as ObjectNode).position;
                //newObjectNode(inputNode, { x: position.x, y: Math.max(0, position.y - 10) });
                subpatch.objectNodes.push(outputNode);
                outputNode.position = { x: position.x, y: Math.max(0, position.y - 30) };
                outputNode.parse('out ' + (i + 1));
            } else {
                let n = subpatch.objectNodes.find(x => x.text === ("out " + (i + 1)));
                if (!n) {
                    continue;
                }
                outputNode = n as ObjectNode;
            }
            for (let outlet of node.outlets) {
                outlet.connections.splice(outlet.connections.indexOf(connection), 1);
            }
            let _connection = objectNode.connect(
                connection.destination,
                connection.destinationInlet,
                objectNode.outlets[i], false);
            registerConnection(connection.source.id, _connection);

            connection.source.connect(
                outputNode,
                outputNode.inlets[0],
                connection.sourceOutlet,
                false);
        }



        for (let node of nodes) {
            // its a object
            node.patch = subpatch;
            if ((node as ObjectNode).operatorContextType !== undefined) {
                subpatch.objectNodes.push(node as ObjectNode);
            } else {
                console.log('adding message=', node);
                subpatch.messageNodes.push(node as MessageNode);
                // its a message
            }
        }

        deleteNodes(nodes as (ObjectNode | MessageNode)[], true);
    }, [patch]);



    let out = React.useMemo(() => {
        let inner = <div
            onMouseMove={onSelectionMove}
            onMouseDown={onMouseDown}
            onClick={onClick}
            className=" flex flex-1 select-none patcher-background z-1">
            {!isCustomView && <Cables />}
            {selection && selection.patch === patch &&
                <div
                    style={{
                        left: selection.x1 + 'px', top: selection.y1 + 'px',
                        width: (selection.x2 - selection.x1) + 'px', height: (selection.y2 - selection.y1) + 'px'
                    }}
                    className="bg-red-500 absolute pointer-events-none z-1 opacity-50 border-zinc-100 border" />}
            {objectNodes.filter(x => presentationMode ? x.attributes["Include in Presentation"] : true).map(
                (objectNode, index) =>
                    objectNode.name === "outputs" ? '' : <ObjectNodeComponent
                        key={objectNode.id}
                        objectNode={objectNode} />
            )}
            {messageNodes.filter(x => presentationMode ? x.attributes["Include in Presentation"] : true).map(
                (messageNode, index) =>
                    <MessageNodeComponent
                        key={messageNode.id}
                        messageNode={messageNode} />
            )}
        </div>

        return (
            <div
                onContextMenu={handleContextMenu}
                className={(isCustomView ? "" : "border border-zinc-800 ") + ("flex flex-col relative w-full ") + (presentationMode ? " presentation " : "") + (lockedMode ? "locked" : "") + (isCustomView ? "" : " tile") + (isCustomView ? " custom-view" : "")}>
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
                {!isCustomView && <div
                    onMouseDown={(e: any) => {

                        e.preventDefault();
                        e.stopPropagation();
                        setResizingPatch({
                            startPosition: { x: e.pageX, y: e.pageY },
                            gridTemplate, resizeType: PatchResizeType.Left
                        })
                    }}
                    className="h-full w-1 absolute left-0 cursor-ew-resize z-30" />}

                <>{isCustomView ? inner : <ContextMenu.Root
                >
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
                        {selectedNodes.length > 0 &&
                            <ContextMenu.Item
                                onClick={() => presentation(selectedNodes)}
                                className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                                Include in Presentation {selectedNodes.length} nodes
                            </ContextMenu.Item>}
                        {selectedNodes.length > 1 &&
                            <ContextMenu.Item
                                onClick={() => encapsulate(selectedNodes)}
                                className="text-white hover:bg-white hover:text-black px-2 py-1 outline-none cursor-pointer">
                                Encapsulate {selectedNodes.length} nodes
                            </ContextMenu.Item>}
                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        ref={scrollRef}
                        className={(isCustomView ? "" : "overflow-scroll") + " ContextMenuTrigger relative"}>
                        {inner}
                    </ContextMenu.Trigger>
                </ContextMenu.Root>}
                    {!isCustomView && <>
                        <Toolbar />
                        <PresentationMode />
                        <LockButton />
                    </>}
                </>
            </div>
        );
    }, [
        visibleObjectNodes,
        objectNodes, patch.objectNodes, messageNodes, selection, patch, lockedMode, presentationMode]);
    return out;
};

export default PatchComponent;
