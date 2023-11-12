import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import ObjectNodeImpl from '@/lib/nodes/ObjectNode';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { PatchImpl } from '@/lib/nodes/Patch';

export interface DraggingNode {
    node: ObjectNode | MessageNode;
    offset: Coordinate;
    origin: Coordinate;
}
export interface DraggingCable {
    sourceNode: ObjectNode | MessageNode;
    sourceOutlet: IOlet;
    sourceCoordinate: Coordinate;
}

interface PositionerContext {

    draggingCable: DraggingCable | null;
    setDraggingCable: (x: DraggingCable | null) => void;
    draggingNode: DraggingNode | null;
    setDraggingNode: (x: DraggingNode | null) => void;
    selectedNodes: (ObjectNode | MessageNode) [];
    setSelectedNodes: (x: ((ObjectNode | MessageNode)[]) ) => void;
    updatePosition: (id: string, position: Coordinate) => void;
    updatePositions: (x: Coordinates) => void;
    updateZIndex: (id: string, zIndex: number) => void;
    coordinates: Coordinates;
    zIndices: ZIndices;
    maxZIndex: number;
    size: Size | null;
    selectedConnection: IOConnection | null;
    setSelectedConnection: (x: IOConnection | null) => void;
}

interface Props {
    children: React.ReactNode;
}

const PositionContext = createContext<PositionerContext | undefined>(undefined);

export const usePosition = (): PositionerContext => {
    const context = useContext(PositionContext);
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

export const PositionProvider: React.FC<Props> = ({ children }) => {

    const [draggingCable, setDraggingCable] = useState<DraggingCable | null>(null);
    const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
    const coordinatesRef = useRef<Coordinates>({});
    const [coordinates, setCoordinates] = useState<Coordinates>(coordinatesRef.current);
    const [zIndices, setZIndices] = useState<ZIndices>({});
    const [size, setSize] = useState<Size | null>(null);
    const [selectedNodes, setSelectedNodes] = useState<(ObjectNode | MessageNode)[] >([]);
    const [selectedConnection, setSelectedConnection] = useState<IOConnection | null>(null);

    useEffect(() => {
        if (selectedNodes.length > 0) {
            setSelectedConnection(null);
        }
    }, [selectedNodes, setSelectedConnection]);

    useEffect(() => {
        if (selectedConnection) {
            setSelectedNodes([]);
        }
    }, [selectedConnection, setSelectedNodes]);

    const updatePositions = useCallback((updates: Coordinates) => {
        console.log("updates=", updates);
        let _coordinates = coordinatesRef.current;
        let _size = size;
        for (let id in updates) {
            let position = updates[id];
            _coordinates[id] = updates[id];
            let height = window.innerHeight;
            let width = window.innerWidth;
            if (_size) {
                height = _size.height;
                width = _size.width;
        }

            if (position.x + 100 > width || position.y + 100 > height) {
                _size = {
                width: Math.max(width, position.x + 100),
                height: Math.max(height, position.y + 100),
                }
            }
        }
        setSize(_size);
        setCoordinates({ ..._coordinates });

    }, [coordinates, setCoordinates, setSize, size]);

    const updatePosition = useCallback((id: string, position: Coordinate) => {
        let _coordinates = coordinatesRef.current;
        _coordinates[id] = position;
        setCoordinates({ ..._coordinates });

        let height = window.innerHeight;
        let width = window.innerWidth;
        if (size) {
            height = size.height;
            width = size.width;
        }

        if (position.x + 100 > width || position.y + 100 > height) {
            setSize({
                width: Math.max(width, position.x + 100),
                height: Math.max(height, position.y + 100),
            });
        }
    }, [coordinates, setCoordinates, setSize, size]);

    const [maxZIndex, setMaxZIndex] = useState(0);

    const updateZIndex = useCallback((id: string, zIndex: number) => {
        let _zIndices = { ...zIndices };
        _zIndices[id] = zIndex;
        setZIndices(_zIndices);
        let max = Math.max(...Object.values(_zIndices));
        setMaxZIndex(max);
    }, [zIndices, setZIndices, setMaxZIndex]);

    return <PositionContext.Provider
        value={{
            updatePositions,
            zIndices,
            maxZIndex,
            updateZIndex,
            coordinates,
            updatePosition,
            size,
            selectedConnection,
            setSelectedConnection,
            draggingCable,
            setDraggingCable,
            selectedNodes,
            setSelectedNodes,
            draggingNode,
            setDraggingNode
        }}>
        {children}
    </PositionContext.Provider>;
};

