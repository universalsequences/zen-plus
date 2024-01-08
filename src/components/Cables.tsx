import React, { memo, useEffect, useCallback, useState } from 'react';;
import { useSelection } from '@/contexts/SelectionContext';
import AlignmentHelper from './AlignmentHelper';
import { useConnections } from '@/hooks/useConnections';
import { useEdgePatch, generatePath } from '@/hooks/useEdgePath';
import { useSelectedConnection } from '@/hooks/useSelectedConnection';
import { ConnectionType, ObjectNode, IOlet, MessageNode, IOConnection, Coordinate } from '@/lib/nodes/types';
import { Coordinates, usePatch } from '@/contexts/PatchContext';
import { DraggingCable, usePosition } from '@/contexts/PositionContext';

const strokeColor = "#2ad4bf";
const Cables = () => {
    let { objectNodes, messageNodes, deleteConnection } = usePatch();
    let { lockedMode, selectedNodes } = useSelection();

    let { size } = usePosition();
    let { presentationMode, draggingNode, scrollRef, setDraggingCable, draggingCable, setDraggingSegmentation } = usePosition();

    let memoed = React.useMemo(() => {
        let _selectedNodes = [...selectedNodes];
        if (draggingNode) {
            _selectedNodes.push(draggingNode.node);
        }
        let zIndex = lockedMode ? 0 : 1000000;
        return (<>
            <svg
                style={size ? { zIndex, width: size.width + 'px', height: size.height + 'px', minWidth: size.width + 'px', minHeight: size.height + 'px' } : { zIndex }}
                className="absolute z-0 w-full h-full pointer-events-none">
                {!presentationMode && [...objectNodes, ...messageNodes].map((node, i) =>
                    <ObjectCables
                        setDraggingSegmentation={setDraggingSegmentation}
                        deleteConnection={deleteConnection} setDraggingCable={setDraggingCable} key={i} node={node} />)}
                <AlignmentHelper />
                {!presentationMode && <Dragging />}

            </svg>
            {/*
            <svg
                style={size ? { width: size.width + 'px', height: size.height + 'px', minWidth: size.width + 'px', minHeight: size.height + 'px' } : {}}
                className="absolute z-0 w-full h-full z-1 pointer-events-none">
                {[...objectNodes.filter(x => !_selectedNodes.includes(x)), ...messageNodes.filter(x => !_selectedNodes.includes(x))].map((node, i) =>
                    <ObjectCables
                        setDraggingSegmentation={setDraggingSegmentation}
                        deleteConnection={deleteConnection} setDraggingCable={setDraggingCable} key={i} node={node} />)}
            </svg>
             */}
        </>
        )
    }, [size, objectNodes, lockedMode, draggingNode, presentationMode, messageNodes, setDraggingSegmentation, setDraggingCable, deleteConnection]);
    return memoed;
};

const Dragging = () => {
    let { scrollRef, setDraggingCable, draggingCable } = usePosition();
    let { zoomRef } = useSelection();

    let [current, setCurrent] = useState<Coordinate | null>(null);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
        }
    }, [draggingCable, setCurrent, setDraggingCable]);

    const onMouseUp = useCallback((e: MouseEvent) => {
        setDraggingCable(null);
    }, [setDraggingCable]);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!scrollRef.current) {
            return;
        }

        let rect = scrollRef.current.getBoundingClientRect();
        let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current
        let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

        // let x = e.clientX;
        //let y = e.clientY;
        if (draggingCable) {
            setCurrent({ x, y });
        }
    }, [draggingCable, setCurrent]);

    if (!draggingCable || !current) {
        return <></>;
    }
    if (draggingCable.sourceCoordinate) {
        return <path fill="transparent" d={generatePath({ x: draggingCable.sourceCoordinate.x - 4, y: draggingCable.sourceCoordinate.y - 4 }, { x: current.x - 4, y: current.y - 4 })[0]} strokeWidth={2} stroke={strokeColor} />
    } else if (draggingCable.destCoordinate) {
        return <path fill="transparent" d={generatePath({ x: draggingCable.destCoordinate.x - 4, y: draggingCable.destCoordinate.y - 4 }, { x: current.x - 4, y: current.y - 4 })[0]} strokeWidth={2} stroke={strokeColor} />
    }
    return <></>
};

const ObjectCables: React.FC<{
    setDraggingSegmentation: (x: IOConnection | null) => void,
    deleteConnection: (x: string, y: IOConnection) => void,
    setDraggingCable: (x: DraggingCable | null) => void, node: ObjectNode | MessageNode
}> = memo(({
    setDraggingSegmentation,
    deleteConnection, node, setDraggingCable }) => {
    let connections = useConnections(node.id);
    let list = React.useMemo(() => {
        let list = [];
        let outletNumber = 0;
        let i = 0;
        for (let outlet of node.outlets) {
            for (let connection of outlet.connections) {
                let dest = connection.destination;
                list.push(<Edge
                    setDraggingSegmentation={setDraggingSegmentation}
                    deleteConnection={deleteConnection}
                    setDraggingCable={setDraggingCable}
                    key={i++} outletNumber={outletNumber} node={node} connection={connection} />);
            }
            outletNumber++;
        }
        return list;
    }, [deleteConnection, setDraggingCable, connections, setDraggingSegmentation]);
    return <>{list}</>
});

const Edge: React.FC<{
    deleteConnection: (x: string, y: IOConnection) => void,
    setDraggingCable: (x: DraggingCable | null) => void,
    setDraggingSegmentation: (x: IOConnection | null) => void,
    node: ObjectNode | MessageNode,
    connection: IOConnection,
    outletNumber: number
}> = ({
    deleteConnection,
    setDraggingCable,
    setDraggingSegmentation,
    connection,
    node,
    outletNumber
}) => {
        let {
            sourceCoordinate,
            destCoordinate,
            d, destinationCircle, sourceCircle } = useEdgePatch(node as ObjectNode, outletNumber, connection);

        let { isSelected, select } = useSelectedConnection(connection);

        const moveSourceEdge = useCallback((e: any) => {
            e.stopPropagation();
            connection.source.disconnect(connection, true);
            deleteConnection((connection.source as any).id, connection);
            setDraggingCable({
                destCoordinate,
                destNode: connection.destination as ObjectNode,
                destInlet: connection.destinationInlet
            })
        }, [destCoordinate, connection, deleteConnection]);

        const moveDestEdge = useCallback((e: any) => {
            e.stopPropagation();
            connection.source.disconnect(connection, true);
            deleteConnection((connection.source as any).id, connection);
            setDraggingCable({
                sourceCoordinate,
                sourceNode: connection.source as ObjectNode,
                sourceOutlet: connection.sourceOutlet
            })
        }, [sourceCoordinate, connection, deleteConnection]);

        const createKeyframes = (d: string, id: string) => {
            return `
@keyframes jiggle-${id} {
        0%, 100% { d: path("${d}"); }
        20% { d: path("${modifyPath(d, 0.1)}"); }
        40% { d: path("${modifyPath(d, 0.10)}"); }
        60% { d: path("${modifyPath(d, 0.85)}"); }
        80% { d: path("${modifyPath(d, 0.35)}"); }
      }
    `;
        };

        const modifyPath = (path: string, factor: number) => {
            // Split the path into segments
            if (!path) {
                return "";
            }
            const segments = path.split(' ');

            // Modify segments based on factor
            // Assuming a cubic Bezier curve format like "M 373 286 C 393 326 392 430 412 470"
            if (segments.length === 11 && segments[0] === 'M' && segments[3] === 'C') {
                // Adjust control points for the jiggle effect
                const controlPoint1Y = parseFloat(segments[5]);
                const controlPoint2Y = parseFloat(segments[9]);

                // Apply a simple jiggle effect by modifying the Y coordinates of the control points
                segments[5] = (controlPoint1Y + 8 * Math.sin(factor * Math.PI * 2)).toString();
                segments[9] = (controlPoint2Y - 8 * Math.sin(factor * Math.PI * 2)).toString();
            }

            return segments.join(' ');
        };

        let [hover, setHover] = useState(false);


        const p = React.useMemo(() => {
            // use 2 paths: one that you see, and another that is invisible but used to capture
            // mouse events
            let isAudio = connection.sourceOutlet.connectionType === ConnectionType.AUDIO;
            let isCore = connection.sourceOutlet.connectionType === ConnectionType.CORE;
            let sourceCoord = (connection.source as ObjectNode).position;
            let destCoord = (connection.destination as ObjectNode).position;
            let id = connection.source.id + connection.destination.id;
            let keyframes = connection.created ? createKeyframes(d[0], id) : "";
            let created = connection.created;
            connection.created = undefined;

            return <>
                <g style={isSelected ? { zIndex: 10000000 } : { zIndex: 0 }} className={(hover ? " hover " : "") + "edge-group"}>
                    {created && <style dangerouslySetInnerHTML={{ __html: keyframes }} />}

                    {d.map((_d, i) => <g key={i}>
                        {(isCore || isAudio) && <path
                            className="visible-edge pointer-events-auto"
                            fill="transparent"
                            d={_d} stroke={isSelected ? "red" : "black"} strokeWidth={2} />}
                        <path
                            style={{ animation: `jiggle-${id} .4s ease-in-out` }}
                            fill="transparent"
                            strokeDasharray={isAudio ?
                                "4 4" : undefined}
                            d={_d} className={(isSelected ? " selected-edge " : "") + ("visible-edge pointer-events-auto ") + (isCore ? "core" : isAudio ? "audio" : "zen")} stroke={isSelected ? "red" : (isCore ? "#ffffff" : isAudio ? "yellow" : strokeColor)} strokeWidth={2} />
                        <path
                            fill="transparent"
                            className={(((d.length === 5 && i === 1) || (d.length === 3 && i === 1)) ? "cursor-ns-resize" : "") + " pointer-events-auto "}
                            onMouseDown={(e: any) => {
                                e.stopPropagation();
                                if (((d.length === 5 && i === 1) || (d.length === 3 && i === 1))) {
                                    setDraggingSegmentation(connection)
                                }
                            }}
                            onClick={(e: any) => {
                                e.stopPropagation();
                                select();
                            }}
                            onMouseOver={() => setHover(true)}
                            onMouseLeave={() => setHover(false)}
                            d={_d} stroke="transparent" strokeWidth={
                                ((d.length === 5 && i === 1) || (d.length === 3 && i === 1)) ? 4 :
                                    2} />
                    </g>
                    )}
                </g>
                {isSelected && sourceCircle && <circle
                    style={{ zIndex: 10000000 }}
                    onMouseDown={moveSourceEdge}
                    cx={sourceCircle.x} cy={sourceCircle.y} r={4} fill="white" className="edge-mover pointer-events-auto" />}
                {isSelected && destinationCircle && <circle
                    style={{ zIndex: 10000000 }}
                    onMouseDown={moveDestEdge}
                    cx={destinationCircle.x} cy={destinationCircle.y} r={4} fill="white" className="edge-mover pointer-events-auto" />}
            </>
        }, [d, destinationCircle, sourceCircle, sourceCoordinate, hover, setHover, destCoordinate, isSelected, setDraggingCable, deleteConnection]);
        return p;
    };


export default Cables;
