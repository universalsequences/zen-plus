import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

type Connections = {
    [x: string]: IOConnection[];
}

interface PatcherContext {
    deleteNodes: (x: (ObjectNode | MessageNode) []) => void;
    connections: Connections;
    registerConnection: (x: string, connection: IOConnection) => void;
    deleteConnection: (id: string, connection: IOConnection) => void;
    patch: Patch;
    messageNodes: MessageNode[];
    objectNodes: ObjectNode[];
    newMessageNode: (x: MessageNode, position: Coordinate) => void;
    newObjectNode: (x: ObjectNode, position: Coordinate) => void;
}

interface Props {
    children: React.ReactNode;
}

const PatchContext = createContext<PatcherContext | undefined>(undefined);

export const usePatch = (): PatcherContext => {
    const context = useContext(PatchContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};

export type Coordinates = {
    [x: string]: Coordinate;
}

type ZIndices = {
    [x: string]: number;
}

type Size = {
    width: number;
    height: number;
}

export const PatchProvider: React.FC<Props> = ({ children }) => {
    const [connections, setConnections] = useState<Connections>({});
    const [patch, setPatch] = useState<Patch>(new PatchImpl());
    const [objectNodes, setObjectNodes] = useState<ObjectNode[]>([]);
    const [messageNodes, setMessageNodes] = useState<MessageNode[]>([]);


    const registerConnection = useCallback((id: string, connection: IOConnection) => {
        if (!(connections[id])) {
            connections[id] = [];
        }
        connections[id] = [...connections[id], connection];
        setConnections({ ...connections });
    }, [setConnections, connections]);

    const deleteConnection = useCallback((id: string, connection: IOConnection) => {
        if ((connections[id])) {
            connections[id] = connections[id].filter(x => x !== connection);
        }
        setConnections({ ...connections });
    }, [setConnections, connections]);

    const deleteNodes = useCallback((nodes: (ObjectNode | MessageNode)[]) => {
        console.log('delete nodes', nodes);
        patch.objectNodes = patch.objectNodes.filter(
            x => !nodes.includes(x));
        
        for (let node of nodes) {
            for (let outlet of node.outlets) {
                for (let connection of outlet.connections) {
                    connection.destination.disconnect(connection);
                    node.disconnect(connection);
                    let id = node.id;
                    if ((connections[id])) {
                        connections[id] = connections[id].filter(x => x !== connection);
                    }
                    id = (connection.destination as any).id;
                    if ((connections[id])) {
                        connections[id] = connections[id].filter(x => x !== connection);
                    }
                }
            }
            for (let inlet of node.inlets) {
                for (let connection of inlet.connections) {
                    connection.source.disconnect(connection);
                    node.disconnect(connection);
                    let id = (connection.source as any).id;
                    if ((connections[id])) {
                        connections[id] = connections[id].filter(x => x !== connection);
                    }
                    id = (connection.destination as any).id;
                    if ((connections[id])) {
                        connections[id] = connections[id].filter(x => x !== connection);
                    }
                }
            }
        }
        setConnections({... connections});
        setObjectNodes([... patch.objectNodes]);
    }, [patch, setObjectNodes, connections, setConnections]);


    const newObjectNode = useCallback((objectNode: ObjectNode, position: Coordinate) => {
        objectNode.position = position;
        patch.objectNodes = [...patch.objectNodes, objectNode];
        setObjectNodes(patch.objectNodes);
    }, [setObjectNodes, patch]);

    const newMessageNode = useCallback((messageNode: MessageNode, position: Coordinate) => {
        messageNode.position = position;
        patch.messageNodes = [...patch.messageNodes, messageNode];
        setObjectNodes(patch.objectNodes);
    }, [setObjectNodes, patch]);

    return <PatchContext.Provider
        value={{
            deleteNodes,
            patch,
            objectNodes,
            messageNodes,
            newMessageNode,
            newObjectNode,
            registerConnection,
            connections,
            deleteConnection
        }}>
        {children}
    </PatchContext.Provider>;
};

