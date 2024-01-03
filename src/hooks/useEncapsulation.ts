import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePosition, ResizingNode, DraggingNode, Coordinates } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import { MessageType, MessageNode, Node, ObjectNode } from '@/lib/nodes/types';

interface Props {
    isCustomView?: boolean, zoomRef: React.MutableRefObject<number>
}
export const useNodeOperations = ({ isCustomView, zoomRef }: Props) => {
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const handleContextMenu = (event: any) => {
        if (isCustomView) {
            return;
        }
        event.preventDefault();
        let e = event;
        if (!scrollRef.current) {
            return;
        }
        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

        setMenuPosition({ x, y });
    };

    const menuPositionRef = useRef(menuPosition);

    useEffect(() => {
        menuPositionRef.current = menuPosition;
    }, [menuPosition]);

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
        draggingCable,
        draggingSegmentation,
    } = usePosition();

    const {
        deleteNodes,
        segmentCable,
        segmentCables,
        updateConnections,
        registerConnection,
        patch, objectNodes, messageNodes, newObjectNode, newMessageNode } = usePatch();

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
                subpatch.messageNodes.push(node as MessageNode);
                // its a message
            }
        }

        deleteNodes(nodes as (ObjectNode | MessageNode)[], true);
    }, [patch]);

    return { encapsulate, handleContextMenu, createMessageNode, createObjectNode, createNumberBox, presentation }
};
