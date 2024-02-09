import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useMessage } from '@/contexts/MessageContext';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';
import { Point, FunctionEditor } from '@/lib/nodes/definitions/core/function';

const FunctionUX: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let ref = useRef<SVGSVGElement | null>(null);
    const { sizeIndex } = usePosition();
    let { width, height } = sizeIndex[objectNode.id] || { width: 300, height: 80 };
    let editor: FunctionEditor = objectNode.custom as FunctionEditor;
    let [points, setPoints] = useState(editor.points);
    let { attributesIndex, lockedMode } = useSelection();

    let { messages } = useMessage();
    let message = messages[objectNode.id];
    useEffect(() => {
        if (message !== undefined) {
            setPoints([...editor.points]);
        }
    }, [message, setPoints]);

    useEffect(() => {
    }, []);

    let [curveEdit, setCurveEdit] = useState<Point | null>(null);

    let [editing, setEditing] = useState<Point | null>(null);
    const onClick = useCallback((e: any) => {
        if (!ref.current) { return; }
        let rect = ref.current.getBoundingClientRect();
        let y = e.clientY - rect.top
        let x = e.clientX - rect.left;

        x = 1000 * (x / width);
        y = 1 - (y / height);

        editor.addBreakPoint({ x, y });
        let point = editor.points[editor.points.length - 1];
        setPoints([...editor.points]);
        setEditing(point);
    }, [setPoints, setEditing, width, height]);

    let paths = editor.toSVGPaths(width, height);


    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [editing, setPoints, setCurveEdit, curveEdit, width, height]);

    const onKeyDown = useCallback((e: any) => {
        if (editing) {
            let key = e.key;
            if (key === "Backspace") {
                editor.points = editor.points.filter(x => x !== editing);
                setEditing(null);
                setPoints([...editor.points]);
            }
        }
    }, [setPoints, editing]);

    const onMouseMove = useCallback((e: any) => {
        if (!ref.current || (!editing && !curveEdit)) {
            return;
        }
        let rect = ref.current.getBoundingClientRect();
        let y = e.clientY - rect.top
        let x = e.clientX - rect.left;
        x = 1000 * (x / width);
        y = 1 - (y / height);
        y = Math.min(1, Math.max(0, y));
        x = Math.min(1000, Math.max(0, x));

        if (editing) {

            editing.x = x;
            editing.y = y;
            setPoints([...editor.points]);
        } else if (curveEdit) {
            curveEdit.c = -1 + (y) * 2;
            setPoints([...editor.points]);
        }
    }, [setPoints, editing, curveEdit]);

    const onMouseUp = useCallback((e: any) => {
        setEditing(null);
        setCurveEdit(null);
        objectNode.receive(objectNode.inlets[0], "bang");
        editor.update();
    }, [setEditing, setCurveEdit, width, height]);

    let sortedPoints = [...points].sort((a, b) => a.x - b.x);

    return React.useMemo(() => {

        return (
            <div
                onMouseDown={(e: any) => {
                    if (lockedMode) {
                        e.stopPropagation();
                        onClick(e);
                    }
                }}
                className={curveEdit ? "cursor-ns-resize flex" : "flex"}
                style={{ width, height: height }}>

                <svg
                    ref={ref}
                    className="my-auto bg-black" width={width} height={height}>
                    {paths.map((d, i) => <g className="transitioncolors active:stroke-red-500 hover:stroke-red-500">
                        <path
                            onMouseDown={(e: any) => {
                                if (lockedMode) {
                                    e.stopPropagation();
                                    setCurveEdit(sortedPoints[i]);
                                }
                            }}
                            className="cursor-ns-resize hover:stroke-red stroke-blue" d={d} stroke="transparent" strokeWidth={8} />
                        <path
                            onMouseDown={(e: any) => {
                                if (lockedMode) {
                                    e.stopPropagation();
                                    setCurveEdit(sortedPoints[i]);
                                }
                            }}
                            className="transition-colors active:stroke-red-500 hover:stroke-red-500 stroke-zinc-400 cursor-ns-resize" d={d} strokeWidth={2} />
                    </g>
                    )}
                    {points.map(
                        point =>
                            <g className="hover:fill-red-500 transition-colors">
                                <circle
                                    onMouseDown={(e: any) => {
                                        e.stopPropagation();
                                        if (!lockedMode) {
                                            return;
                                        }
                                        setEditing(point);
                                    }}
                                    className="cursor-pointer"
                                    cx={3 + width * point.x / 1000} cy={(1.0 - point.y) * height} r={6} fill={"transparent"} />
                                <circle
                                    onMouseDown={(e: any) => {
                                        e.stopPropagation();
                                        if (!lockedMode) {
                                            return;
                                        }
                                        setEditing(point);
                                    }}

                                    cx={width * point.x / 1000} cy={(1.0 - point.y) * height} r={4} className="cursor-pointer fill-white hover:fill-red-500" />
                            </g>
                    )}
                </svg>
            </div >
        );
    }, [width, height, lockedMode, points, setCurveEdit, editing, curveEdit]);
}
export default FunctionUX;
