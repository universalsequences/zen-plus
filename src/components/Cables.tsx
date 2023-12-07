import React, { memo, useEffect, useCallback, useState } from 'react';;
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
    let { size } = usePosition();
    let { scrollRef, setDraggingCable, draggingCable } = usePosition();

    let memoed = React.useMemo(() => {
        return (<svg
            style={size ? { width: size.width + 'px', height: size.height + 'px', minWidth: size.width + 'px', minHeight: size.height + 'px' } : {}}
            className="absolute z-0 w-full h-full z-1">
            {[...objectNodes, ...messageNodes].map((node, i) =>
                <ObjectCables
                    deleteConnection={deleteConnection} setDraggingCable={setDraggingCable} key={i} node={node} />)}
            <AlignmentHelper />
            <Dragging />
        </svg>)
    }, [size, objectNodes, messageNodes, setDraggingCable, deleteConnection]);
    return memoed;
};

const Dragging = () => {
    let { scrollRef, setDraggingCable, draggingCable } = usePosition();

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
        let x = scrollRef.current.scrollLeft + client.x;
        let y = scrollRef.current.scrollTop + client.y;

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
        return <path fill="transparent" d={generatePath({ x: draggingCable.sourceCoordinate.x - 4, y: draggingCable.sourceCoordinate.y - 4 }, { x: current.x - 4, y: current.y - 4 })} strokeWidth={2} stroke={strokeColor} />
    } else if (draggingCable.destCoordinate) {
        return <path fill="transparent" d={generatePath({ x: draggingCable.destCoordinate.x - 4, y: draggingCable.destCoordinate.y - 4 }, { x: current.x - 4, y: current.y - 4 })} strokeWidth={2} stroke={strokeColor} />
    }
    return <></>
};

const ObjectCables: React.FC<{
    deleteConnection: (x: string, y: IOConnection) => void,
    setDraggingCable: (x: DraggingCable | null) => void, node: ObjectNode | MessageNode
}> = memo(({ deleteConnection, node, setDraggingCable }) => {
    let connections = useConnections(node.id);
    let list = React.useMemo(() => {
        let list = [];
        let outletNumber = 0;
        let i = 0;
        for (let outlet of node.outlets) {
            for (let connection of outlet.connections) {
                let dest = connection.destination;
                list.push(<Edge
                    deleteConnection={deleteConnection}
                    setDraggingCable={setDraggingCable}
                    key={i++} outletNumber={outletNumber} node={node} connection={connection} />);
            }
            outletNumber++;
        }
        return list;
    }, [deleteConnection, setDraggingCable, connections]);
    return <>{list}</>
});

const Edge: React.FC<{
    deleteConnection: (x: string, y: IOConnection) => void,
    setDraggingCable: (x: DraggingCable | null) => void,
    node: ObjectNode | MessageNode,
    connection: IOConnection,
    outletNumber: number
}> = ({
    deleteConnection,
    setDraggingCable,
    connection,
    node,
    outletNumber
}) => {
        let {
            sourceCoordinate,
            destCoordinate,
            d, destinationCircle, sourceCircle } = useEdgePatch(node as ObjectNode, outletNumber, connection);

        let { isSelected, select } = useSelectedConnection(connection);
        //let [hover, setHover] = useState(false);

        const moveSourceEdge = useCallback((e: any) => {
            e.stopPropagation();
            connection.source.disconnect(connection);
            deleteConnection((connection.source as any).id, connection);
            setDraggingCable({
                destCoordinate,
                destNode: connection.destination as ObjectNode,
                destInlet: connection.destinationInlet
            })
        }, [destCoordinate, connection, deleteConnection]);

        const moveDestEdge = useCallback((e: any) => {
            e.stopPropagation();
            connection.source.disconnect(connection);
            deleteConnection((connection.source as any).id, connection);
            setDraggingCable({
                sourceCoordinate,
                sourceNode: connection.source as ObjectNode,
                sourceOutlet: connection.sourceOutlet
            })
        }, [sourceCoordinate, connection, deleteConnection]);

        const p = React.useMemo(() => {
            // use 2 paths: one that you see, and another that is invisible but used to capture
            // mouse events
            let isAudio = connection.sourceOutlet.connectionType === ConnectionType.AUDIO;
            let isCore = connection.sourceOutlet.connectionType === ConnectionType.CORE;
            return <>
                <g className="edge-group">
                    {(isCore || isAudio) && <path
                        className="visible-edge"
                        fill="transparent"
                        d={d} stroke={isSelected ? "red" : "black"} strokeWidth={2} />}
                    <path
                        className="visible-edge"
                        fill="transparent"
                        strokeDasharray={isAudio ?
                            "4 4" : undefined}
                        d={d} stroke={isSelected ? "red" : (isCore ? "#979797" : isAudio ? "yellow" : strokeColor)} strokeWidth={2} />
                    <path
                        fill="transparent"
                        onMouseDown={(e: any) => e.stopPropagation()}
                        onClick={(e: any) => {
                            e.stopPropagation();
                            select();
                        }}
                        d={d} stroke="transparent" strokeWidth={4} />

                </g>
                {isSelected && sourceCircle && <circle
                    style={{ zIndex: 10000000 }}
                    onMouseDown={moveSourceEdge}
                    cx={sourceCircle.x} cy={sourceCircle.y} r={4} fill="white" className="edge-mover" />}
                {isSelected && destinationCircle && <circle
                    style={{ zIndex: 10000000 }}
                    onMouseDown={moveDestEdge}
                    cx={destinationCircle.x} cy={destinationCircle.y} r={4} fill="white" className="edge-mover" />}
            </>
        }, [d, destinationCircle, sourceCircle, sourceCoordinate, destCoordinate, isSelected, setDraggingCable, deleteConnection]);
        return p;
    };


export default Cables;
