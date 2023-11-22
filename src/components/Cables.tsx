import React, { memo, useEffect, useCallback, useState } from 'react';;
import AlignmentHelper from './AlignmentHelper';
import { useConnections } from '@/hooks/useConnections';
import { useEdgePatch, generatePath } from '@/hooks/useEdgePath';
import { useSelectedConnection } from '@/hooks/useSelectedConnection';
import { ObjectNode, IOlet, IOConnection, Coordinate } from '@/lib/nodes/types';
import { Coordinates, usePatch } from '@/contexts/PatchContext';
import { usePosition } from '@/contexts/PositionContext';

const strokeColor = "#2ad4bf";
const Cables = () => {
    let { objectNodes } = usePatch();
    let { size } = usePosition();

    let memoed = React.useMemo(() => {
        return (<svg
            style={size ? { width: size.width + 'px', height: size.height + 'px', minWidth: size.width + 'px', minHeight: size.height + 'px' } : {}}
            className="absolute z-0 w-full h-full z-1">
            {objectNodes.map((node, i) => <ObjectCables key={i} node={node} />)}
            <AlignmentHelper />
            <Dragging />
        </svg>)
    }, [size, objectNodes]);
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

    return draggingCable && current &&
        <path fill="transparent" d={generatePath({ x: draggingCable.sourceCoordinate.x - 4, y: draggingCable.sourceCoordinate.y - 4 }, { x: current.x - 4, y: current.y - 4 })} strokeWidth={2} stroke={strokeColor} />
};

const ObjectCables: React.FC<{ node: ObjectNode }> = memo(({ node }) => {
    let connections = useConnections(node.id);
    let list = React.useMemo(() => {
        let list = [];
        let outletNumber = 0;
        for (let outlet of node.outlets) {
            for (let connection of outlet.connections) {
                let dest = connection.destination;
                list.push(<Edge key={outletNumber} outletNumber={outletNumber} node={node} connection={connection} />);
            }
            outletNumber++;
        }
        return list;
    }, [connections]);
    return <>{list}</>
});

const Edge: React.FC<{ node: ObjectNode, connection: IOConnection, outletNumber: number }> = ({ connection, node, outletNumber }) => {
    let d = useEdgePatch(node, outletNumber, connection);
    let { isSelected, select } = useSelectedConnection(connection);
    //let [hover, setHover] = useState(false);

    const p = React.useMemo(() => {
        // use 2 paths: one that you see, and another that is invisible but used to capture
        // mouse events
        return <g className="edge-group">
            <path
                className="visible-edge"
                fill="transparent"
                d={d} stroke={isSelected ? "red" : strokeColor} strokeWidth={2} />
            <path
                fill="transparent"
                onMouseDown={(e: any) => e.stopPropagation()}
                onClick={(e: any) => {
                    e.stopPropagation();
                    select();
                }}
                //onMouseOver={() => setHover(true)}
                //onMouseLeave={() => setHover(false)}
                d={d} stroke="transparent" strokeWidth={16} />
        </g>
    }, [d, isSelected]);
    return p;
};


export default Cables;
