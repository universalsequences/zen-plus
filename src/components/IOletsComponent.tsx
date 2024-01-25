import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { IOlet, ObjectNode, MessageNode } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';
import { usePatch } from '@/contexts/PatchContext';
import * as Tooltip from '@radix-ui/react-tooltip';

interface Props {
    node: ObjectNode | MessageNode;
    iolets: IOlet[];
    className: string;
    isOutlet: boolean;
    text?: string;
}
const IOletsComponent = (props: Props) => {
    const { setNearestInlet, nearestInlet, scrollRef, setDraggingCable, draggingCable } = usePosition();
    const { isCustomView, patch, registerConnection } = usePatch();
    const { opened, zoomRef } = useSelection();

    const onMouseDown = useCallback((
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        iolet: IOlet) => {
        if (!scrollRef.current) {
            return;
        }
        if (props.isOutlet) {
            e.stopPropagation();

            let rect = scrollRef.current.getBoundingClientRect();
            let client = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            let x = (scrollRef.current.scrollLeft + client.x) / zoomRef.current;
            let y = (scrollRef.current.scrollTop + client.y) / zoomRef.current;

            let sourceCoordinate = { x, y };
            setDraggingCable({
                sourceCoordinate,
                sourceNode: props.node,
                sourceOutlet: iolet
            });
        }
    }, []);

    const onMouseUp = useCallback((e: any, iolet: IOlet) => {
        if (draggingCable) {
            e.stopPropagation();
            let { sourceNode, sourceOutlet, destNode, destInlet } = draggingCable;
            if (sourceNode && sourceOutlet && !props.isOutlet) {
                let connection = sourceNode.connect(props.node, iolet, sourceOutlet, true);
                connection.created = true;
                registerConnection(sourceNode.id, connection);
                setDraggingCable(null);
                setNearestInlet(null);
            } else if (destNode && destInlet && props.isOutlet) {
                let connection = props.node.connect(destNode, destInlet, iolet, true);
                connection.created = true;
                registerConnection(props.node.id, connection);
                setDraggingCable(null);
                setNearestInlet(null);
            }
        }
    }, [draggingCable, setDraggingCable]);

    let numIOlets = props.iolets.length;
    let [hover, setHover] = useState<IOlet | null>(null);

    let memoed = React.useMemo(() => {
        if (isCustomView) {
            return <></>;
        }
        return (
            <div className={props.className + ' w-full justify-between iolets'}>
                {props.iolets.map(
                    (iolet, i) =>
                        <Tooltip.Provider
                            disableHoverableContent={true}
                            key={i}
                            delayDuration={200}>
                            <Tooltip.Root
                                open={(opened === props.node && (props.node as ObjectNode).subpatch ? true : false) || hover === iolet}
                                onOpenChange={(e) => setHover(e ? iolet : null)}
                            >
                                <Tooltip.Trigger asChild>
                                    <div
                                        key={i}
                                        style={{ zIndex: 10000000000000000 }}
                                        onMouseUp={(e: any) => {
                                            // e.stopPropagation();
                                            onMouseUp(e, iolet);
                                        }}
                                        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseDown(
                                            e, iolet)}
                                        className={(nearestInlet && nearestInlet.node === props.node && nearestInlet.iolet === i && props.isOutlet === nearestInlet.isOutlet ? "nearest-inlet " : "") + (iolet.hidden ? "opacity-0 " : "") + (iolet.connections.length > 0 ? "  border-teal-400 bg-black hover:bg-teal-400 " : "bg-zinc-400 border-zinc-100 hover:border-red-500 ") + " border-2 w-2 h-2 rounded-full  hover:bg-red-500 z-30"}>
                                    </div>
                                </Tooltip.Trigger>
                                <Tooltip.Portal
                                >
                                    <Tooltip.Content
                                        style={{ zIndex: 100000000000, fontSize: 10 }}
                                        side={props.isOutlet ? "bottom" : "top"} className="pointer-events-none  bg-zinc-100 px-1 py-0.5 text-black rounded-lg " sideOffset={5}>
                                        {iolet.name || ((props.isOutlet ? "outlet " : "inlet ") + (props.iolets.indexOf(iolet) + 1))}
                                        <Tooltip.Arrow fill="white" className="TooltipArrow" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                )
                }
            </div >);
    }, [props.iolets, nearestInlet, numIOlets, draggingCable, props.text, opened, hover, setHover, isCustomView]);
    return memoed;
}

export default IOletsComponent;
