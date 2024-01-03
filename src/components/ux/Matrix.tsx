import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMessage } from '@/contexts/MessageContext';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';

const Matrix: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let attributes = objectNode.attributes;
    let [matrix, setMatrix] = useState<number[]>(Array.from(objectNode.buffer || []));
    let { attributesIndex, lockedMode } = useSelection();
    let ref = useRef<HTMLDivElement>(null);
    let { messages } = useMessage();

    let message = messages[objectNode.id];

    useEffect(() => {
        if (message) {
            setMatrix(message as number[]);
        }
    }, [message, setMatrix]);

    let { rows, columns } = attributes;
    const toggle = useCallback((row: number, col: number) => {
        let idx = row * (columns as number) + col;
        if (objectNode.buffer) {
            let val = objectNode.buffer[idx] ? 0 : 1;
            objectNode.receive(objectNode.inlets[0], [col, row, val]);
            setMatrix(Array.from(objectNode.buffer));
        }
    }, [setMatrix, columns, rows]);


    const { sizeIndex } = usePosition();
    let { width, height } = sizeIndex[objectNode.id] || { width: 100, height: 100 };
    const [size, setSize] = useState({ width, height });
    let size_x = (width - (columns as number) * 4) / (columns as number);
    let size_y = (height - (rows as number) * 4) / (rows as number);

    let memo = React.useMemo(() => {
        let _rows = [];
        for (let i = 0; i < (rows as number); i++) {
            let row = [];
            for (let j = 0; j < (columns as number); j++) {
                let idx = i * (columns as number) + j;
                let value = matrix[idx];
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
                                <div
                                    key={index}
                                    onMouseDown={(e: any) => e.stopPropagation()}
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        toggle(rowIndex, index);
                                    }}
                                    style={{
                                        width: size_x,
                                        minWidth: 10,
                                        minHeight: 10,
                                        margin: "2px",
                                        height: size_y,
                                        backgroundColor: value ? "#2ad4bf" : ""
                                    }}
                                    className={"rounded-full border bg-black-clear2 border-zinc-800 cursor-pointer active:bg-zinc-800 active:border-zinc-100 "}>

                                </div>)}
                    </div>)}
        </div>);
    }, [rows, columns, matrix, setMatrix, width, height, message]);
    return memo;
};

export default Matrix;
