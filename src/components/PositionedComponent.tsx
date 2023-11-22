import React, { useRef, useState, useEffect, useCallback } from 'react';
import IOletsComponent from './IOletsComponent';
import { lookupDoc } from '@/lib/nodes/definitions/doc';
import { Definition } from '@/lib/docs/docs';
import { ObjectNode, MessageNode, Patch, Coordinate, Positioned, Identifiable } from '@/lib/nodes/types';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { usePositionStyle } from '@/hooks/usePositionStyle';

const PositionedComponent: React.FC<{
    children: React.ReactNode,
    node: ObjectNode | MessageNode
}> = ({ node, children }) => {

    const { setSelectedNodes, selectedNodes } = useSelection();
    const { setDraggingNode, updateZIndex, maxZIndex } = usePosition();

    const ref = useRef<HTMLDivElement | null>(null);

    const style = usePositionStyle(node);

    const initialPosition = useRef<Coordinate | null>(null);

    const maxZIndexRef = useRef(maxZIndex);
    useEffect(() => {
        maxZIndexRef.current = maxZIndex;
    }, [maxZIndex])

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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


    const out = React.useMemo(() => {
        let minWidth = Math.max(40, node.inlets.length * 15,);
        let className = "absolute h-7 node-component bg-black-clear text-black border text-xs flex overflow-hidden hover:overflow-visible ";
        let isSelected = selectedNodes.includes(node);
        if (!isSelected) {
            className += " border-zinc-700";
        } else {
            className += " border-zinc-100";
        }
        return (
            <div
                ref={ref}
                onClick={onClick}
                onMouseDown={onMouseDown}
                style={{
                    ...style,
                    minWidth: `${minWidth}px`
                }}
                className={className}
            >
                {isSelected &&
                    <>
                        <div className="absolute top-0 right-0 w-1 h-1 bg-zinc-300 cursor-ew-resize" />
                        <div className="absolute bottom-0 right-0 w-1 h-1 bg-zinc-300 cursor-ew-resize" />
                        <div className="absolute top-0 left-0 w-1 h-1 bg-zinc-300 cursor-ew-resize" />
                        <div className="absolute bottom-0 left-0 w-1 h-1 bg-zinc-300 cursor-ew-resize" />
                    </>}
                <IOletsComponent
                    isOutlet={false}
                    className="absolute flex -top-1"
                    node={node} iolets={node.inlets} />
                <IOletsComponent
                    isOutlet={true}
                    className="absolute flex -bottom-1"
                    node={node} iolets={node.outlets} />
                {children}
            </div>);
    }, [node, children, style]);
    return out;
};

export default PositionedComponent;
