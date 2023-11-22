import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';

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

export interface AlignmentLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface PositionerContext {
    scrollRef: React.MutableRefObject<HTMLDivElement | null>;
    draggingCable: DraggingCable | null;
    setDraggingCable: (x: DraggingCable | null) => void;
    draggingNode: DraggingNode | null;
    setDraggingNode: (x: DraggingNode | null) => void;
    updatePosition: (id: string, position: Coordinate) => void;
    updatePositions: (x: Coordinates) => Coordinates;
    updateZIndex: (id: string, zIndex: number) => void;
    coordinates: Coordinates;
    zIndices: ZIndices;
    maxZIndex: number;
    size: Size | null;
    alignmentLines: AlignmentLine[]
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
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);

    const updatePositions = useCallback((updates: Coordinates): Coordinates => {
        if (!scrollRef.current) {
            return updates;
        }

        if (Object.keys(updates).length === 1) {
            updates = calculateAlignmentLine(updates, coordinates);
        } else {
            setAlignmentLines([]);
        }

        let _coordinates = coordinatesRef.current;
        let _size = size;
        let sizeChanged = false;
        for (let id in updates) {
            let position = updates[id];
            _coordinates[id] = updates[id];
            let height = scrollRef.current.offsetHeight;
            let width = scrollRef.current.offsetWidth;
            if (_size) {
                height = _size.height;
                width = _size.width;
            }

            if (position.x + 100 > width || position.y + 100 > height) {
                sizeChanged = true;
                _size = {
                    width: Math.max(width, position.x + 100),
                    height: Math.max(height, position.y + 100),
                }
            }
        }

        if (sizeChanged) {
            setSize(_size);
        }
        setCoordinates({ ..._coordinates });
        return updates;
    }, [coordinates, setCoordinates, setSize, size, setAlignmentLines]);

    const calculateAlignmentLine = useCallback((updates: Coordinates, positions: Coordinates): Coordinates => {
        let _updates = { ...updates };
        let xAlignmentLines: AlignmentLine[] = [];
        let yAlignmentLines: AlignmentLine[] = [];
        let foundX = false;
        let foundY = false;
        let minDistanceX = Infinity;
        let minDistanceY = Infinity;
        for (let id in updates) {
            for (let _id in positions) {
                if (id === _id) {
                    continue;
                }
                let coord1 = updates[id];
                let coord2 = positions[_id];
                let oldCoord = positions[id];

                let diffX = Math.abs(coord1.x - coord2.x);
                let diffY = Math.abs(coord1.y - coord2.y);
                let distance = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));

                if (distance < minDistanceX && diffX < 10) {
                    // then we need vertical alignment
                    let alignmentLine = { x1: coord2.x, y1: coord2.y, x2: coord2.x, y2: oldCoord.y };
                    minDistanceX = distance;
                    xAlignmentLines = [alignmentLine];
                    _updates[id].x = coord2.x;
                } else if (distance < minDistanceY && diffY < 10) {
                    let alignmentLine = { x1: coord2.x, y1: coord2.y, x2: oldCoord.x, y2: coord2.y };
                    yAlignmentLines = [alignmentLine];
                    minDistanceY = distance;
                    _updates[id].y = coord2.y;
                }
            }
        }
        setAlignmentLines([...xAlignmentLines, ...yAlignmentLines]);
        return _updates;
    }, [setAlignmentLines]);

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
            draggingCable,
            setDraggingCable,
            draggingNode,
            setDraggingNode,
            scrollRef,
            alignmentLines
        }}>
        {children}
    </PositionContext.Provider>;
};

