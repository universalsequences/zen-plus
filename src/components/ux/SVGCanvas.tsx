import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SVGObject } from '@/lib/nodes/definitions/svg/index';
import { useMessage } from '@/contexts/MessageContext';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';

const SVGCanvas: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let ref = useRef<SVGSVGElement>(null);
    let { messages } = useMessage();
    let [dragging, setDragging] = useState<number | null>(null);

    let w = objectNode.size ? objectNode.size.width : 50;
    let h = objectNode.size ? objectNode.size.height : 50;

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
        }
    }, [dragging, setDragging, w, h]);

    const onMouseMove = useCallback((e: any) => {
        if (!dragging) {
            return;
        }

        if (!ref.current) {
            return;
        }
        let x = e.clientX;
        let y = e.clientY;
        let rect = ref.current.getBoundingClientRect();
        let _x = x - rect.left
        let _y = y - rect.top;

        _x = Math.max(0, Math.min(_x, w));
        _y = Math.max(0, Math.min(_y, h));
        objectNode.send(objectNode.outlets[dragging], [_x, _y]);
    }, [dragging, w, h]);

    const onMouseUp = useCallback((e: any) => {
        setDragging(null);
    }, [setDragging]);

    const { sizeIndex } = usePosition();
    let { width, height } = sizeIndex[objectNode.id] || { width: 100, height: 100 };

    let message = messages[objectNode.id];

    let memo = React.useMemo(() => {
        let l: SVGObject[] = Array.isArray(message) ? message as unknown as SVGObject[] : [message] as SVGObject[];
        if (!message) {
            l = [];
        }
        return (<svg
            ref={ref}
            width={w}
            height={h}
            style={{ minWidth: 50, minHeight: 50 }} className="">
            {l.map(
                (x, i) => x.type === "path" ? <path
                    onMouseDown={(e: any) => {
                        e.stopPropagation();
                        setDragging(i);
                    }}
                    d={x.d} stroke={x.stroke} fill="transparent" strokeWidth={x.strokeWidth} /> :
                    x.type === "circle" ?
                        <circle
                            onMouseDown={(e: any) => {
                                e.stopPropagation();
                                setDragging(i);
                            }}
                            cx={x.coordinate[0]} cy={x.coordinate[1]} r={x.radius} fill={x.fill} /> : <></>)}
        </svg>);
    }, [message, w, h, setDragging]);
    return memo;
};

export default SVGCanvas;
