import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { IOlet, ObjectNode, MessageNode } from '@/lib/nodes/types';
import { usePatch } from '@/contexts/PatchContext';

interface Props {
    node: ObjectNode | MessageNode;
    iolets: IOlet[];
    className: string;
    isOutlet: boolean;
}
const IOletsComponent = (props: Props) => {
    const { setDraggingCable, draggingCable } = usePosition();
    const { registerConnection } = usePatch();

    const onMouseDown = useCallback((
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        iolet: IOlet) => {
        if (props.isOutlet) {
            e.stopPropagation();
            let sourceCoordinate = { x: e.clientX, y: e.clientY };
            setDraggingCable({
                sourceCoordinate,
                sourceNode: props.node,
                sourceOutlet: iolet
            });
        }
    }, []);

    const onMouseUp = useCallback((iolet: IOlet) => {
        if (!props.isOutlet && draggingCable) {
            let { sourceNode, sourceOutlet } = draggingCable;
            let connection = sourceNode.connect(props.node, iolet, sourceOutlet);
            registerConnection(sourceNode.id, connection);
        }
    }, [draggingCable, setDraggingCable]);

    return (
        <div className={props.className}>
            {props.iolets.map(
                (iolet, i) =>
                    <div
                        key={i}
                        onMouseUp={() => onMouseUp(iolet)}
                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseDown(
                            e, iolet)}
                        className={(iolet.hidden ? "opacity-0 " : "") + (iolet.connections.length > 0 ? "  border-teal-400 bg-black hover:bg-teal-400 " : "bg-white hover:border-red-500 ") +" border-2 w-2 h-2 rounded-full  mr-2 hover:bg-red-500"}>
                    </div>)}
        </div>);
}

export default IOletsComponent;
