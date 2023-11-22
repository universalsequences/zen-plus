import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { IOlet, ObjectNode, MessageNode } from '@/lib/nodes/types';
import { usePatch } from '@/contexts/PatchContext';
import * as Tooltip from '@radix-ui/react-tooltip';

interface Props {
    node: ObjectNode | MessageNode;
    iolets: IOlet[];
    className: string;
    isOutlet: boolean;
}
const IOletsComponent = (props: Props) => {
    const { scrollRef, setDraggingCable, draggingCable } = usePosition();
    const { registerConnection } = usePatch();

    const onMouseDown = useCallback((
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        iolet: IOlet) => {
        console.log('on mouse down called=', iolet);
        if (!scrollRef.current) {
            return;
        }
        if (props.isOutlet) {
            e.stopPropagation();


            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            let x = scrollRef.current.scrollLeft + client.x;
            let y = scrollRef.current.scrollTop + client.y;

            let sourceCoordinate = { x, y };
            setDraggingCable({
                sourceCoordinate,
                sourceNode: props.node,
                sourceOutlet: iolet
            });
        }
    }, []);

    const onMouseUp = useCallback((iolet: IOlet) => {
        console.log('on mouse up called...', draggingCable);
        if (!props.isOutlet && draggingCable) {
            let { sourceNode, sourceOutlet } = draggingCable;
            let connection = sourceNode.connect(props.node, iolet, sourceOutlet, true);
            registerConnection(sourceNode.id, connection);
        }
    }, [draggingCable, setDraggingCable]);

    let numIOlets = props.iolets.length;
    let memoed = React.useMemo(() => {
        return (
            <div className={props.className}>
                {props.iolets.map(
                    (iolet, i) =>
                        <Tooltip.Provider
                            disableHoverableContent={true}
                            key={i}
                            delayDuration={200}>
                            <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                    <div
                                        key={i}
                                        onMouseUp={() => onMouseUp(iolet)}
                                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseDown(
                                            e, iolet)}
                                        className={(iolet.hidden ? "opacity-0 " : "") + (iolet.connections.length > 0 ? "  border-teal-400 bg-black hover:bg-teal-400 " : "bg-white hover:border-red-500 ") + " border-2 w-2 h-2 rounded-full  mr-2 hover:bg-red-500"}>
                                    </div>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content
                                        style={{ zIndex: 100000000000 }}
                                        side={props.isOutlet ? "bottom" : "top"} className="pointer-events-none text-xs bg-zinc-100 px-2 py-1 text-black rounded-full" sideOffset={5}>
                                        {iolet.name || ((props.isOutlet ? "outlet " : "inlet ") + (props.iolets.indexOf(iolet) + 1))}
                                        <Tooltip.Arrow fill="white" className="TooltipArrow" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                )}
            </div>);
    }, [props.iolets, numIOlets, draggingCable]);
    return memoed;
}

export default IOletsComponent;
