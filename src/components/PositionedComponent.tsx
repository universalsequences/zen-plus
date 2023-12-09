import React, { useRef, useState, useEffect, useCallback } from 'react';
import { index } from './ux/index';
import IOletsComponent from './IOletsComponent';
import { Definition } from '@/lib/docs/docs';
import { MessageType, ObjectNode, MessageNode, Orientation, Patch, Coordinate, Positioned, Identifiable } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { usePositionStyle } from '@/hooks/usePositionStyle';

const PositionedComponent: React.FC<{
    text?: string,
    lockedModeRef: React.MutableRefObject<boolean>
    skipOverflow?: boolean,
    children: React.ReactNode,
    node: ObjectNode | MessageNode
}> = ({ text, node, children, skipOverflow, lockedModeRef }) => {

    const { setSelectedNodes, selectedNodes } = useSelection();
    const { sizeIndex, setDraggingNode, setResizingNode, updateSize, updateZIndex, maxZIndex } = usePosition();

    const ref = useRef<HTMLDivElement | null>(null);

    const style = usePositionStyle(node);

    const initialPosition = useRef<Coordinate | null>(null);

    const maxZIndexRef = useRef(maxZIndex);
    useEffect(() => {
        maxZIndexRef.current = maxZIndex;
    }, [maxZIndex])

    useEffect(() => {
        if (ref.current) {
            updateSize(node.id, {
                width: ref.current.offsetWidth,
                height: ref.current.offsetHeight
            });
        }
    }, [node.attributes, text]);

    const startResizing = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>, orientation: Orientation) => {
        e.stopPropagation();
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            let x = e.clientX;// - divRect.left;
            let y = e.clientY;// - divRect.top

            setResizingNode({
                node: node,
                offset: { x, y },
                origin: { ...node.position },
                orientation: orientation
            });
        }
    }, [setResizingNode]);

    const startResizingY = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            let x = e.clientX;// - divRect.left;
            let y = e.clientY;// - divRect.top

            setResizingNode({
                node: node,
                offset: { x, y },
                origin: { ...node.position },
                orientation: Orientation.Y
            });
        }
    }, [setResizingNode]);


    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (lockedModeRef.current) {
            return;
        }
        e.stopPropagation();
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            let x = e.clientX - divRect.left;
            let y = e.clientY - divRect.top

            if (!selectedNodes.includes(node)) {
                setSelectedNodes([node]);
            }

            initialPosition.current = { ...node.position };

            setDraggingNode({
                node: node,
                offset: { x, y },
                origin: { ...node.position }
            });

            node.zIndex = maxZIndexRef.current + 1;
            updateZIndex(node.id, node.zIndex);
        }
    }, [setDraggingNode, selectedNodes]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            e.stopPropagation();

        }
    }, [setDraggingNode, setSelectedNodes, node, maxZIndex]);

    let size = sizeIndex[node.id];
    const out = React.useMemo(() => {
        let minWidth = Math.max(40, node.inlets.length * 15);
        if (size && size.width > minWidth) {
            minWidth = size.width;
        } else {
        }
        let isCustom = index[(node as ObjectNode).name || ""] != undefined;
        let _skipOverflow = node.attributes["scripting name"] !== undefined &&
            node.attributes["scripting name"] !== "";
        if (skipOverflow) {
            _skipOverflow = true;
        }
        let className = (isCustom ? "" : "h-7 border bg-black-clear") + ` absolute  node-component text-black text-xs flex ${_skipOverflow ? "" : "overflow-hidden"} hover:overflow-visible `;
        if ((node as MessageNode).messageType === MessageType.Message) {
            className += " rounded-md";
            minWidth = 60;
            className = className.replace("h-7", "h-6");
            className += " bg-zinc-600";
            className = className.replace("bg-black-clear", "");
            className += " pushable";
        }
        let isSelected = selectedNodes.includes(node);
        if (!isSelected) {
            className += " border-zinc-700";
        } else {
            className += " border-zinc-100";
        }

        if ((node as ObjectNode).operatorContextType && !isCustom) {
            className += " context-type-" + (node as ObjectNode).operatorContextType;
        }

        return (
            <div
                ref={ref}
                onClick={onClick}
                onMouseDown={onMouseDown}
                style={{
                    ...style,
                    minWidth: `${minWidth}px`,
                    //width: `${minWidth}px`,
                }}
                className={className}
            >
                {isSelected &&
                    <>
                        <div className="absolute top-0 right-0 w-1 h-1 bg-zinc-300 " />
                        <div
                            onClick={(e: any) => e.stopPropagation()}
                            onMouseDown={
                                (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => startResizing(e, Orientation.XY)}

                            style={{ maxWidth: 25, maxHeight: 25 }}
                            className="absolute bottom-0 right-0 w-1 h-1 bg-zinc-300 cursor-se-resize z-30" />
                        <div className="absolute top-0 left-0 w-1 h-1 bg-zinc-300 " />
                        <div className="absolute bottom-0 left-0 w-1 h-1 bg-zinc-300 " />
                        {isCustom && <div
                            onClick={(e: any) => e.stopPropagation()}
                            onMouseDown={
                                (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => startResizing(e, Orientation.Y)}
                            className={"absolute bottom-0 left-0 h-0.5 w-full cursor-ns-resize z-10 " + (isCustom ? "" : "")} />}
                        {<div
                            onClick={(e: any) => e.stopPropagation()}
                            onMouseDown={
                                (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => startResizing(e, Orientation.X)}
                            className={"absolute top-0 right-0 w-0.5 h-full  cursor-ew-resize z-10 " + (isCustom ? "" : "")} />}
                    </>}
                <IOletsComponent
                    text={text}
                    isOutlet={false}
                    className="absolute flex -top-1"
                    node={node} iolets={node.inlets} />
                <IOletsComponent
                    text={text}
                    isOutlet={true}
                    className="absolute flex -bottom-1"
                    node={node} iolets={node.outlets} />
                {children}
            </div>);

    }, [node, size, children, style, text]);
    return out;
};

export default PositionedComponent;
