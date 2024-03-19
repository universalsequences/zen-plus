import React, { useEffect, useState, useRef, useCallback } from 'react';
import MatrixInnerCell from './MatrixInnerCell';
import { Position } from './Matrix';
import { ObjectNode } from '@/lib/nodes/types';
import { useValue } from '@/contexts/ValueContext';

const MatrixCell: React.FC<{ min: number, unit: string, showValue: boolean, ux: string, fillColor: string, max: number, cornerRadius: string, width: number, height: number, toggle: (row: number, col: number, value?: number) => void, type: string, lockedMode: boolean, objectNode: ObjectNode, idx: number, row: number, col: number, editing: React.MutableRefObject<Position | null> }> = ({
    idx, row, col, editing, objectNode, unit, lockedMode, showValue, type, toggle, cornerRadius, width, height, max, fillColor, ux, min }) => {

    let [isSelected, setIsSelected] = useState<boolean>(false);
    useValue();

    useEffect(() => {
        if (objectNode.saveData) {
            setIsSelected((objectNode.saveData as number) === idx);
        }
    }, [objectNode.saveData, setIsSelected]);


    let valueRef = useRef(0);
    let ref = useRef<HTMLDivElement>(null);
    let ref1 = useRef<HTMLDivElement>(null);
    let isLine = ux === "line";
    let isFullRadius = cornerRadius === "full";
    useEffect(() => {
        if (ref1.current) {
            ref1.current.className = `${isLine ? "absolute w-full" : isFullRadius ? "m-auto" : "absolute bottom-0 w-full"} rounded-${cornerRadius}`;
        }
    }, [isLine, isFullRadius, cornerRadius]);


    return React.useMemo(() => {
        return (<div
            ref={ref}
            onMouseDown={(e: any) => {
                if (!lockedMode) {
                } else {
                    e.stopPropagation();
                    if (type === "float" || type === "uint8") {
                        let rect = ref.current?.getBoundingClientRect();
                        let startY = e.clientY - rect!.top;
                        editing.current = { x: col, y: row, value: valueRef.current, startY };
                    } else {
                        toggle(row, col);
                    }
                }
            }}
            onMouseOver={(e: any) => {
                if (editing.current && (editing.current.x !== col || editing.current.y !== row)) {
                    if (type === "float" || type === "uint8") {
                        let rect = ref.current?.getBoundingClientRect();
                        let startY = e.clientY - rect!.top;
                        if (editing.current.y === row) {
                            //startY = editing.current.startY;
                            let val = max * ((height - startY) / height);
                            toggle(row, col, val);
                            valueRef.current = val;
                        }
                        editing.current = { x: col, y: row, value: valueRef.current, startY };
                    }
                }
            }}
            onClick={(e: any) => {
                if (lockedMode) {
                    e.stopPropagation();
                }
            }}
            style={{
                backgroundColor: isSelected ? "#fafafa42" : "",
                borderColor: isSelected ? "white" : "",
                width: width,
                minWidth: 10,
                minHeight: 10,
                margin: "2px",
                height: height,
            }}
            className={`relative flex rounded-${cornerRadius} overflow-hidden border bg-black-clear2 border-zinc-800 cursor-pointer active:bg-zinc-800 active:border-zinc-100 `}>
            <MatrixInnerCell
                ref1={ref1}
                min={min}
                objectNode={objectNode} isLine={ux === 'line'} idx={idx} valueRef={valueRef} unit={unit} isFullRadius={cornerRadius === "full"} cornerRadius={cornerRadius} max={max} showValue={showValue} fillColor={fillColor} />
        </div>);
    }, [isSelected, width, height, fillColor, showValue, max, cornerRadius, lockedMode, ux, unit, min]);
};

export default MatrixCell;
