import React, { useRef, useState, useEffect, useCallback } from 'react';
import IOletsComponent from './IOletsComponent';
import { lookupDoc } from '@/lib/nodes/definitions/doc';
import { Definition } from '@/lib/docs/docs';
import { ObjectNode, MessageNode, Patch, Coordinate, Positioned, Identifiable } from '@/lib/nodes/types';

import { usePosition } from '@/contexts/PositionContext';
import { usePositionStyle } from '@/hooks/usePositionStyle';

const PositionedComponent: React.FC<{
    children: React.ReactNode,
    node: ObjectNode | MessageNode
}> = ({ node, children }) => {
    const { setDraggingNode, updateZIndex, maxZIndex, setSelectedNodes, selectedNodes } = usePosition();

    const ref = useRef<HTMLDivElement | null>(null);

    const style = usePositionStyle(node);

    const initialPosition = useRef<Coordinate | null>(null);

    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            let x = e.clientX - divRect.left;
            let y = e.clientY - divRect.top
            node.zIndex = maxZIndex + 1;
            updateZIndex(node.id, node.zIndex);

            if (!selectedNodes.includes(node)) {
                setSelectedNodes([node]);
            }

            initialPosition.current = { ...node.position };

            setDraggingNode({
                node: node,
                offset: { x, y },
                origin: {... node.position}
            });

            node.zIndex = maxZIndex + 1;
            updateZIndex(node.id, node.zIndex);
        }
    }, [setDraggingNode, node, maxZIndex, selectedNodes]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        let divRect = ref.current?.getBoundingClientRect();
        if (divRect) {
            e.stopPropagation();
            
        }
    }, [setDraggingNode, setSelectedNodes, node, maxZIndex]);


    const out = React.useMemo(() => {
        let className = "absolute h-7  bg-zinc-500 text-black border text-xs flex overflow-hidden hover:overflow-visible ";
        if (!selectedNodes.includes(node)) {
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
                    minWidth: "40px"
                }}
                className={className}
            >
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
