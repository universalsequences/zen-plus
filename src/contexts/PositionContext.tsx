import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Patch, IOlet, Attributes, IOConnection, MessageNode, Orientation, ObjectNode, Coordinate } from '@/lib/nodes/types';

const ALIGNMENT_GRID = 6;
export interface ResizingNode {
    node: ObjectNode | MessageNode;
    offset: Coordinate;
    origin: Coordinate;
    orientation: Orientation;
}

export interface DraggingNode {
    node: ObjectNode | MessageNode;
    offset: Coordinate;
    origin: Coordinate;
}

export interface DraggingCable {
    sourceNode?: ObjectNode | MessageNode;
    sourceOutlet?: IOlet;
    sourceCoordinate?: Coordinate;
    destNode?: ObjectNode | MessageNode;
    destInlet?: IOlet;
    destCoordinate?: Coordinate;
}

export interface AlignmentLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface PositionerContext {
    updateSize: (id: string, x: Size) => void;
    sizeIndexRef: React.MutableRefObject<SizeIndex>;
    deletePositions: (x: ObjectNode[]) => void;
    sizeIndex: SizeIndex;
    setNearestInlet: (x: NearestInlet | null) => void;
    nearestInlet: NearestInlet | null;
    checkNearInlets: (x: number, y: number) => void;
    setSizeIndex: (x: SizeIndex) => void;
    preparePresentationMode: boolean;
    setPreparePresentationMode: (x: boolean) => void;
    scrollRef: React.MutableRefObject<HTMLDivElement | null>;
    setDraggingSegmentation: (x: IOConnection | null) => void;
    draggingSegmentation: IOConnection | null;
    draggingCable: DraggingCable | null;
    setDraggingCable: (x: DraggingCable | null) => void;
    draggingNode: DraggingNode | null;
    setDraggingNode: (x: DraggingNode | null) => void;
    resizingNode: ResizingNode | null;
    setResizingNode: (x: ResizingNode | null) => void;
    updatePosition: (id: string, position: Coordinate) => void;
    updatePositions: (x: Coordinates, replace?: boolean) => Coordinates;
    updateZIndex: (id: string, zIndex: number) => void;
    coordinates: Coordinates;
    zIndices: ZIndices;
    maxZIndex: number;
    size: Size | null;
    alignmentLines: AlignmentLine[]
    presentationMode: boolean;
    setPresentationMode: (x: boolean) => void;
}

interface Props {
    children: React.ReactNode;
    patch: Patch;
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

export type SizeIndex = {
    [id: string]: Size;
}

export interface NearestInlet {
    node: ObjectNode | MessageNode;
    iolet: number;
    isOutlet: boolean;
}

export const PositionProvider: React.FC<Props> = ({ children, patch }) => {

    const [preparePresentationMode, setPreparePresentationMode] = useState(false);
    const [sizeIndex, setSizeIndex] = useState<SizeIndex>({});

    useEffect(() => {
        let _size = { ...sizeIndex };
        for (let node of patch.objectNodes) {
            if (node.size) {
                _size[node.id] = node.size;
            }
        }
        setSizeIndex(_size);
        sizeIndexRef.current = _size;
    }, [patch.objectNodes, setSizeIndex]);

    const sizeIndexRef = useRef<SizeIndex>(sizeIndex);
    useEffect(() => {
        sizeIndexRef.current = sizeIndex;
    }, [sizeIndex]);

    const updateSize = useCallback((id: string, size: Size) => {
        let _size = { ...sizeIndexRef.current }
        _size[id] = size;
        sizeIndexRef.current = { ..._size };
        setSizeIndex(_size);
    }, [setSizeIndex, sizeIndex]);

    const [draggingCable, setDraggingCable] = useState<DraggingCable | null>(null);
    const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
    const [resizingNode, setResizingNode] = useState<ResizingNode | null>(null);
    const [draggingSegmentation, setDraggingSegmentation] = useState<IOConnection | null>(null);
    const coordinatesRef = useRef<Coordinates>({});
    const [coordinates, setCoordinates] = useState<Coordinates>(coordinatesRef.current);
    const [zIndices, setZIndices] = useState<ZIndices>({});
    const [size, setSize] = useState<Size | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [alignmentLines, setAlignmentLines] = useState<AlignmentLine[]>([]);
    let [presentationMode, setPresentationMode] = useState(patch.presentationMode);
    const [nearestInlet, setNearestInlet] = useState<NearestInlet | null>(null);

    const checkNearInlets = useCallback((x: number, y: number) => {
        if (!draggingCable) {
            return;
        }
        // find nearest 
        let nearestDist: number = 1000000;
        let nearestNode: ObjectNode | MessageNode | null = null;
        let nearestInlet: number = 0;
        for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
            if (draggingCable.destNode ? draggingCable.destNode === node : node === draggingCable.sourceNode) {
                continue;
            }
            let position = node.position;
            let size = sizeIndexRef.current[node.id] || { width: 30, height: 10 };
            let width = size.width;

            let iolets = draggingCable.destNode ? node.outlets : node.inlets;
            for (let i = 0; i < iolets.length; i++) {
                if (iolets[i].hidden) {
                    continue;
                }
                if (iolets[i].connections.filter(x => draggingCable.destNode ? draggingCable.destNode === x.destination : draggingCable.sourceNode === x.source).length > 0) {
                    continue;
                }
                let offX = i * width / iolets.length;
                let distance = Math.sqrt(Math.pow((position.x + offX) - x, 2) + Math.pow(position.y - y, 2));
                if (distance < 100 && distance < nearestDist) {
                    nearestDist = distance;
                    nearestNode = node;
                    nearestInlet = i;
                }
            }
        }
        if (nearestNode) {
            setNearestInlet({
                node: nearestNode,
                iolet: nearestInlet,
                isOutlet: draggingCable.destNode !== undefined
            });
        } else {
            setNearestInlet(null);
        }
    }, [setNearestInlet, draggingCable]);

    const updatePositions = useCallback((updates: Coordinates, replace?: boolean): Coordinates => {
        if (!scrollRef.current) {
            return updates;
        }

        if (Object.keys(updates).length === 1) {
            updates = calculateAlignmentLine(updates, coordinates);
        } else {
            setAlignmentLines([]);
        }

        let _coordinates = replace ? {} : coordinatesRef.current;
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

            let node_size = sizeIndexRef.current[id];
            let w = node_size ? node_size.width + 50 : 100;
            let h = node_size ? node_size.height + 50 : 100;
            if (position.x + w > width || position.y + h > height) {
                sizeChanged = true;
                _size = {
                    width: Math.max(width, position.x + w),
                    height: Math.max(height, position.y + h),
                }
            }
        }

        if (sizeChanged) {
            setSize(_size);
        }
        coordinatesRef.current = _coordinates;
        setCoordinates({ ..._coordinates });
        return updates;
    }, [coordinates, setCoordinates, setSize, size, setAlignmentLines]);

    const calculateAlignmentLine = useCallback((updates: Coordinates, positions: Coordinates): Coordinates => {
        let _updates = { ...updates };
        let xAlignmentLines: AlignmentLine[] = [];
        let yAlignmentLines: AlignmentLine[] = [];
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

                let size1 = sizeIndexRef.current[id];
                let size2 = sizeIndexRef.current[_id];
                let width1 = size1 ? size1.width : 0;
                let height1 = size2 ? size2.height : 0;
                let height2 = size1 ? size1.height : 0;
                let diffX2 = Math.abs(coord1.x + width1 - coord2.x);
                let diffY2 = Math.abs(coord2.y + height1 - coord1.y);

                let diffY1 = Math.abs(coord1.y + height2 - coord2.y);

                let midPointX = size2 ? (coord2.x + size2.width / 2) : coord2.x;
                let midPointX1 = size1 ? (coord1.x + size1.width / 2) : coord1.x;
                let diffX3 = Math.abs(midPointX1 - midPointX);

                if (distance < minDistanceX && diffX < ALIGNMENT_GRID) {
                    // then we need vertical alignment
                    let alignmentLine = { x1: coord2.x, y1: coord2.y, x2: coord2.x, y2: oldCoord.y };
                    minDistanceX = distance;
                    xAlignmentLines = [alignmentLine];
                    _updates[id].x = coord2.x;
                } else if (distance < minDistanceX && diffX2 < ALIGNMENT_GRID) {
                    let alignmentLine = { x1: coord2.x, y1: coord2.y, x2: coord2.x, y2: oldCoord.y };
                    minDistanceX = distance;
                    xAlignmentLines = [alignmentLine];
                    _updates[id].x = coord2.x - width1;
                } else if (distance < minDistanceX && diffX3 < ALIGNMENT_GRID) {
                    let alignmentLine = { x1: midPointX, y1: coord2.y, x2: midPointX, y2: oldCoord.y };
                    minDistanceX = distance;
                    xAlignmentLines = [alignmentLine];
                    let width = size1 ? size1.width : 0;
                    _updates[id].x = midPointX - width / 2;
                }

                if (distance < minDistanceY && diffY2 < ALIGNMENT_GRID) {
                    let alignmentLine = { x1: coord2.x, y1: coord2.y + height1, x2: coord1.x, y2: coord2.y + height1 };
                    minDistanceY = distance;
                    xAlignmentLines = [alignmentLine];
                    let width = size1 ? size1.width : 0;
                    _updates[id].y = coord2.y + height1;
                    yAlignmentLines = [alignmentLine];
                } else if (distance < minDistanceY && diffY1 < ALIGNMENT_GRID) {
                    let alignmentLine = { x1: coord2.x, y1: coord2.y, x2: coord1.x, y2: coord2.y };
                    minDistanceY = distance;
                    xAlignmentLines = [alignmentLine];
                    _updates[id].y = coord2.y - height2;
                    yAlignmentLines = [alignmentLine];
                } else if (distance < minDistanceY && diffY < ALIGNMENT_GRID) {
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

    const deletePositions = useCallback((nodes: ObjectNode[]) => {
        let _coordinates: Coordinates = {};
        for (let id in coordinatesRef.current) {
            if (nodes.some(x => x.id === id)) {
                continue;
            }
            _coordinates[id] = coordinatesRef.current[id];
        }
        setCoordinates(_coordinates);
        coordinatesRef.current = _coordinates;
    }, [setCoordinates, coordinates]);

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
            alignmentLines,
            sizeIndexRef,
            sizeIndex,
            updateSize,
            setSizeIndex,
            resizingNode,
            setResizingNode,
            deletePositions,
            draggingSegmentation,
            setDraggingSegmentation,
            presentationMode,
            setPresentationMode,
            preparePresentationMode,
            setPreparePresentationMode,
            checkNearInlets,
            nearestInlet,
            setNearestInlet
        }}>
        {children}
    </PositionContext.Provider>;
};

