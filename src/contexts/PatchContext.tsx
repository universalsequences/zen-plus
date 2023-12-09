import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { getSegmentation } from '@/lib/cables/getSegmentation';
import { usePosition } from '@/contexts/PositionContext';
import { SizeIndex } from './PositionContext';
import { currentUUID, uuid, plusUUID, registerUUID } from '@/lib/uuid/IDGenerator';
import { Project } from '@/contexts/StorageContext';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import {
    Positioned,
    Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate, SubPatch
} from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

export type Connections = {
    [x: string]: IOConnection[];
}

interface PatcherContext {
    segmentCable: (x: IOConnection, segment: number) => void;
    segmentCables: (sizeIndex: SizeIndex) => void;
    loadProject: (x: Project) => void;
    updateConnections: (x: Connections) => void;
    deleteNodes: (x: (ObjectNode | MessageNode)[]) => void;
    connections: Connections;
    registerConnection: (x: string, connection: IOConnection) => void;
    deleteConnection: (id: string, connection: IOConnection) => void;
    patch: Patch;
    setPatch: (x: Patch) => void;
    messageNodes: MessageNode[];
    objectNodes: ObjectNode[];
    newMessageNode: (x: MessageNode, position: Coordinate) => void;
    newObjectNode: (x: ObjectNode, position: Coordinate) => void;
}

interface Props {
    children: React.ReactNode;
    patch: Patch;
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

export const PatchProvider: React.FC<Props> = ({ children, ...props }) => {
    const [connections, setConnections] = useState<Connections>({});
    const [patch, setPatch] = useState<Patch>(props.patch);
    const [objectNodes, setObjectNodes] = useState<ObjectNode[]>([]);
    const [messageNodes, setMessageNodes] = useState<MessageNode[]>([]);


    const loadProject = useCallback((project: Project) => {
        patch.name = project.name;
        patch.objectNodes = [];
        let connections = patch.fromJSON(project.json);
        setConnections(connections);
        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);
    }, [setMessageNodes, setObjectNodes, patch, setConnections]);

    useEffect(() => {
        setPatch(props.patch);
    }, [props.patch]);

    useEffect(() => {
    }, [props.patch]);

    useEffect(() => {
        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);

        let connections: Connections = {};
        for (let node of patch.objectNodes) {
            let _connections: IOConnection[] = [];
            for (let outlet of node.outlets) {
                _connections = [..._connections, ...outlet.connections];
            }
            connections[node.id] = _connections;
        }
        setConnections(connections);
    }, [patch, setObjectNodes, setMessageNodes])

    const segmentCable = useCallback((connection: IOConnection, segment: number) => {
        connection.segmentation = segment;
        setConnections({ ...connections });
    }, [setConnections, connections]);

    const segmentCables = useCallback((sizeIndex: SizeIndex) => {
        for (let id in connections) {
            for (let connection of connections[id]) {
                if (connection.segmentation === undefined) {
                    connection.segmentation = getSegmentation(connection, sizeIndex);
                }
            }
        }
        setConnections({ ...connections });
    }, [setConnections, connections]);


    const registerConnection = useCallback((id: string, connection: IOConnection) => {
        if (!(connections[id])) {
            connections[id] = [];
        }
        connections[id] = [...connections[id], connection];
        setConnections({ ...connections });
    }, [setConnections, connections]);

    const updateConnections = useCallback((x: Connections) => {
        setConnections({
            ...connections,
            ...x
        });
    }, [setConnections]);

    let connectionsRef = useRef<Connections>(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    const deleteConnection = useCallback((id: string, connection: IOConnection) => {
        if ((connectionsRef.current[id])) {
            connectionsRef.current[id] = connections[id].filter(x => x !== connection);
        }
        setConnections({ ...connectionsRef.current });
    }, [setConnections, connections]);

    const deleteNodes = useCallback((nodes: (ObjectNode | MessageNode)[]) => {
        patch.objectNodes = patch.objectNodes.filter(
            x => !nodes.includes(x));
        patch.messageNodes = patch.messageNodes.filter(
            x => !nodes.includes(x));

        for (let node of nodes) {
            let name = (node as ObjectNode).name;
            if (name == "in" || name === "out") {
                // delete inlet if neede
                let parentNode = (node.patch as SubPatch).parentNode;
                if (parentNode) {
                    let args = (node as ObjectNode).arguments;
                    if (args && args[0]) {
                        let ioletNumber: number = (args[0] as number) - 1;
                        if (name === "in") {
                            parentNode.inlets.splice(ioletNumber, 1);
                        } else {
                            parentNode.outlets.splice(ioletNumber, 1);
                        }
                    }
                }

            }

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
        setConnections({ ...connections });
        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);
    }, [patch, setObjectNodes, connections, setConnections]);


    const newObjectNode = useCallback((objectNode: ObjectNode, position: Coordinate) => {
        objectNode.position = position;
        patch.objectNodes = [...patch.objectNodes, objectNode];
        setObjectNodes(patch.objectNodes);
    }, [setObjectNodes, patch]);

    const newMessageNode = useCallback((messageNode: MessageNode, position: Coordinate) => {
        messageNode.position = position;
        patch.messageNodes = [...patch.messageNodes, messageNode];
        setMessageNodes(patch.messageNodes);
    }, [setObjectNodes, patch]);

    return <PatchContext.Provider
        value={{
            updateConnections,
            setPatch,
            deleteNodes,
            patch,
            objectNodes,
            messageNodes,
            newMessageNode,
            newObjectNode,
            registerConnection,
            connections,
            deleteConnection,
            loadProject,
            segmentCable,
            segmentCables
        }}>
        {children}
    </PatchContext.Provider>;
};

