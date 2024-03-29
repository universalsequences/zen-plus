import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocked } from '@/contexts/LockedContext';
import { ValueProvider } from '@/contexts/ValueContext';
import * as mat from '@/lib/nodes/definitions/core/matrix';
import MatrixCell from './MatrixCell';
import { useMessage } from '@/contexts/MessageContext';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';

export interface Position {
    x: number;
    y: number;
    value: number;
    startY: number;
}
const Matrix: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let attributes = objectNode.attributes;
    let { attributesIndex } = useSelection();
    let editing = useRef<Position | null>(null);
    let ref = useRef<HTMLDivElement>(null);
    let { unit, showValue, min, max, fillColor, cornerRadius, type, rows, columns } = attributes;
    const toggle = useCallback((row: number, col: number, value?: number) => {
        let idx = row * (columns as number) + col;
        if (objectNode.buffer) {
            let val = value !== undefined ? value : objectNode.buffer[idx] ? 0 : 1;
            objectNode.receive(objectNode.inlets[0], [col, row, val]);
        }
    }, [columns, rows]);


    const { sizeIndex } = usePosition();
    const { lockedMode } = useLocked();
    let { width, height } = objectNode.size || { width: 100, height: 100 };
    let size = objectNode.size || { width: 100, height: 100 };
    let size_x = (width - (columns as number) * 4) / (columns as number);
    let size_y = (height - (rows as number) * 4) / (rows as number);

    //   useEffect(() => {
    //        console.log('size index of matrix=', sizeIndex[objectNode.id], sizeIndex);
    //  }, [sizeIndex[objectNode.id]]);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }
    }, [editing, size, rows, max]);

    const onMouseUp = useCallback(() => {
        editing.current = null;
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!ref.current || !editing.current) {
            return;
        }
        if (!size) {
            return;
        }
        let rect = ref.current.getBoundingClientRect();
        let height = 0 + (size.height / (rows as number));
        let client = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - editing.current.y * height // - (editing.current.startY)
        };
        let DIFF = (editing.current.startY - client.y);
        let v = editing.current.value + ((min as number) + (max as number) * DIFF) / (editing.current.startY);
        if (DIFF < 0) {
            v = editing.current.value + ((min as number) + (max as number) * (DIFF)) / ((height) - editing.current.startY);

        }
        let value = Math.min(max as number, v);
        if (value < (min as number)) {
            value = min as number;
        }
        if (isNaN(value)) {
            value = 0;
        }

        /*
        let _value = -1 * (((client.y) / (height))) * (max as number);
        let diff = (_value - editing.current.value) * Math.min(3, 1 / editing.current.startY);
        let value = Math.min(max as number, editing.current.value + _value);
        if (value < (min as number)) {
            value = min as number;
        }
        */
        toggle(editing.current.y, editing.current.x, value);
        if (objectNode.custom) {
            (objectNode.custom as any as mat.Matrix).update();
        }

    }, [editing, columns, size, max, min]);

    let ux = objectNode.attributes["ux"];

    let memo = React.useMemo(() => {
        let _rows = [];
        for (let i = 0; i < (rows as number); i++) {
            let row = [];
            for (let j = 0; j < (columns as number); j++) {
                let idx = i * (columns as number) + j;
                let value = 0;
                row.push(value);
            }
            _rows.push(row);
        }

        return (<div ref={ref} className="flex flex-col">
            {_rows.map(
                (row, rowIndex) =>
                    <div
                        key={rowIndex}
                        className="flex">
                        {row.map(
                            (value, index) =>
                                <MatrixCell
                                    cornerRadius={cornerRadius as string}
                                    fillColor={fillColor as string}
                                    row={rowIndex}
                                    col={index}
                                    idx={(index + rowIndex * (columns as number))}
                                    toggle={toggle}
                                    width={size_x}
                                    height={size_y}
                                    showValue={showValue as boolean}
                                    lockedMode={lockedMode}
                                    unit={unit as string}
                                    objectNode={objectNode}
                                    ux={ux as string}
                                    type={type as string}
                                    editing={editing}
                                    min={min as number}
                                    max={objectNode.attributes["max"] as number}
                                    key={index} />
                        )}
                    </div>)}
        </div >
        );

    }, [min, unit, rows, columns, width, height, type, fillColor, editing, lockedMode, max, toggle, ux, showValue, cornerRadius]);
    return memo;
};

export default Matrix;
