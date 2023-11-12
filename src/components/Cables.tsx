import React, { memo, useEffect, useCallback, useState } from 'react';;
import { useConnections } from '@/hooks/useConnections';
import { useEdgePatch } from '@/hooks/useEdgePath';
import { useSelectedConnection } from '@/hooks/useSelectedConnection';
import { ObjectNode, IOlet, IOConnection, Coordinate } from '@/lib/nodes/types';
import { Coordinates, usePatch } from '@/contexts/PatchContext';
import { usePosition } from '@/contexts/PositionContext';

const Cables = () => {
    let { objectNodes } = usePatch();
    let { size } = usePosition();

    let memoed = React.useMemo(() => {
        return (<svg
            style={size ? { minWidth: size.width + 'px', minHeight: size.height + 'px' } : {}}
            className="absolute z-0 w-full h-full ">
            {objectNodes.map((node, i) => <ObjectCables key={i} node={node} />)}
            <Dragging />
        </svg>)
    }, [size, objectNodes]);
    return memoed;
};

const Dragging = () => {
    let { setDraggingCable, draggingCable } = usePosition();

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
        let x = e.clientX;
        let y = e.clientY;
        if (draggingCable) {
            setCurrent({ x, y });
        }
    }, [draggingCable, setCurrent]);

    return draggingCable && current &&
        <path d={generatePath(draggingCable.sourceCoordinate, current)} stroke="red" />
};

const ObjectCables: React.FC<{ node: ObjectNode }> = memo(({ node }) => {
    let connections = useConnections(node.id);
    let list = React.useMemo(() => {
        let list = [];
        let outletNumber = 0;
        for (let outlet of node.outlets) {
            for (let connection of outlet.connections) {
                let dest = connection.destination;
                list.push(<Edge outletNumber={outletNumber} node={node} connection={connection} />);
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
    let [hover, setHover] = useState(false);

    const p = React.useMemo(() => {
        // use 2 paths: one that you see, and another that is invisible but used to capture
        // mouse events
        return <g>
            <path
                fill="transparent"
                d={d} stroke={isSelected || hover ? "red" : "white"} strokeWidth={2} />
            <path
                fill="transparent"
                onMouseDown={(e: any) => e.stopPropagation()}
                onClick={(e: any) => {
                    e.stopPropagation();
                    select();
                }}
                onMouseOver={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                d={d} stroke="transparent" strokeWidth={16} />
        </g>
    }, [d, isSelected, hover]);
    return p;
};

const generatePath = (source: Coordinate, dest: Coordinate) => {
    let x1 = source.x;
    let y1 = source.y;
    let x2 = dest.x;
    let y2 = dest.y;

    return `M ${x1},${y1} L ${x2},${y2}`;
};



export default Cables;
