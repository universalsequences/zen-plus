import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePosition, ResizingNode, DraggingNode, Coordinates } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import MessageNodeImpl from '@/lib/nodes/MessageNode';
import { MessageType, MessageNode, Node, IOlet, ObjectNode } from '@/lib/nodes/types';

interface Props {
    isCustomView?: boolean, zoomRef: React.MutableRefObject<number>,
    scrollRef: React.MutableRefObject<HTMLDivElement | null>
}
export const useNodeOperations = ({ isCustomView, zoomRef, scrollRef }: Props) => {
    const handleContextMenu = useCallback((event: any) => {
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
        console.log('scroll ref handlecontextmenu x/y', x, y);
        console.log('rect.left=%s rect.top=%s', rect.left, rect.top);

        console.log('setting menu positionref=', x, y);
        menuPositionRef.current = { x, y }
    }, []);

    const menuPositionRef = useRef({ x: 0, y: 0 });

    /*
    useEffect(() => {
        menuPositionRef.current = menuPosition;
    }, [menuPosition]);
    */

    let {
        updatePosition,
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
        console.log('create object node with =', { ...menuPositionRef.current });
        newObjectNode(objectNode, { ...menuPositionRef.current });
        updatePosition(objectNode.id, { ...menuPositionRef.current });
        return objectNode;
    }, [objectNodes]);

    const createNumberBox = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch, MessageType.Number);
        newMessageNode(messageNode, { ...menuPositionRef.current });
        updatePosition(messageNode.id, { ...menuPositionRef.current });
    }, [messageNodes]);

    const createMessageNode = useCallback(() => {
        let messageNode = new MessageNodeImpl(patch, MessageType.Message);
        newMessageNode(messageNode, { ...menuPositionRef.current });
        updatePosition(messageNode.id, { ...menuPositionRef.current });
    }, [messageNodes]);

    const presentation = useCallback((nodes: Node[]) => {
        for (let node of nodes) {
            (node as ObjectNode).setAttribute("Include in Presentation", true);
            (node as ObjectNode).presentationPosition = { ... (node as ObjectNode).position };
        }
    }, []);


    const encapsulate = useCallback((nodes: Node[]) => {
        nodes = nodes.filter(x => (x as ObjectNode).name !== "in" && (x as ObjectNode).name !== "out");
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

        let inputNodes: ObjectNode[] = [];
        let incomingNodes: IOlet[] = [];
        let inletCounter = 0;

        for (let i = 0; i < inboundConnections.length; i++) {
            let node = inboundConnections[i].destination;
            let connection = inboundConnections[i];
            let existingIndex = incomingNodes.indexOf(connection.sourceOutlet);
            console.log('existing index = ', existingIndex, connection.source, connection.sourceOutlet);
            let inputNode: ObjectNode = existingIndex >= 0 ? inputNodes[existingIndex] : new ObjectNodeImpl(subpatch);
            if (i >= 2) {
                let position = (node as ObjectNode).position;
                //newObjectNode(inputNode, { x: position.x, y: Math.max(0, position.y - 10) });
                if (existingIndex === -1) {
                    subpatch.objectNodes.push(inputNode);
                    inputNode.position = { x: position.x, y: Math.max(0, position.y - 30) };
                    let name = connection.sourceOutlet.name || "";
                    inputNode.parse('in ' + (inletCounter + 1) + " " + name);
                    inputNodes.push(inputNode);
                    incomingNodes.push(connection.sourceOutlet);
                    inletCounter++;
                }
            } else {
                let n = subpatch.objectNodes.find(x => x.text.includes("in " + (i + 1)));
                if (!n) {
                    continue;
                }
                inputNode = n as ObjectNode;
                if (existingIndex === -1) {
                    inputNodes.push(inputNode);
                    incomingNodes.push(connection.sourceOutlet);
                    inletCounter++;
                }
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
            let _index = existingIndex >= 0 ? existingIndex : inletCounter - 1;

            if (existingIndex === -1) {
                let _connection = connection.source.connect(
                    objectNode,
                    objectNode.inlets[_index], connection.sourceOutlet, false);
                registerConnection(connection.source.id, _connection);
            }

            inputNode.connect(
                connection.destination,
                connection.destinationInlet,
                inputNode.outlets[0],
                false);
        }

        let outputNodes: ObjectNode[] = [];
        let outerNodes: IOlet[] = [];
        let outletCounter = 1;
        for (let i = 0; i < outboundConnections.length; i++) {
            let node = outboundConnections[i].source;
            let connection = outboundConnections[i];
            let existingIndex = outerNodes.indexOf(connection.sourceOutlet);
            let outputNode: ObjectNode = existingIndex >= 0 ? outputNodes[existingIndex] : new ObjectNodeImpl(subpatch);
            if (i >= 1) {
                let position = (node as ObjectNode).position;
                //newObjectNode(inputNode, { x: position.x, y: Math.max(0, position.y - 10) });
                if (existingIndex === -1) {
                    subpatch.objectNodes.push(outputNode);
                    outputNode.position = { x: position.x, y: Math.max(0, position.y - 30) };
                    outputNode.parse('out ' + (outletCounter + 1));
                    outputNodes.push(outputNode);
                    outerNodes.push(connection.sourceOutlet);
                    outletCounter++;
                } else {
                }
            } else {
                let n = subpatch.objectNodes.find(x => x.text === ("out " + (i + 1)));
                if (!n) {
                    continue;
                }
                outputNode = n as ObjectNode;
                if (existingIndex === -1) {
                    outputNodes.push(outputNode);
                    outerNodes.push(connection.sourceOutlet);
                }
            }
            for (let outlet of node.outlets) {
                outlet.connections.splice(outlet.connections.indexOf(connection), 1);
            }
            let _index = existingIndex >= 0 ? existingIndex : outletCounter - 1;
            let _connection = objectNode.connect(
                connection.destination,
                connection.destinationInlet,
                objectNode.outlets[_index], false);
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
