import React, { useRef, useEffect, useState } from 'react';
import { ObjectNode } from '@/lib/nodes/types';
import { useValue } from '@/contexts/ValueContext';

const MatrixInnerCell: React.FC<{ min: number, ref1: React.RefObject<HTMLDivElement>, fillColor: string, max: number, cornerRadius: string, isFullRadius: boolean, showValue: boolean, unit: string, valueRef: React.MutableRefObject<number>, idx: number, objectNode: ObjectNode, isLine: boolean }> = ({ objectNode, isLine, idx, valueRef, unit, isFullRadius, cornerRadius, max, min, showValue, fillColor, ref1 }) => {
    let [value, setValue] = useState(0);
    let { value: counter } = useValue();
    let ref2 = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (objectNode.buffer && valueRef.current !== objectNode.buffer[idx]) {
            setValue(objectNode.buffer[idx]);
            valueRef.current = objectNode.buffer[idx];
        }
    }, [setValue, (objectNode.buffer as Float32Array | Uint8Array)[idx]]);

    useEffect(() => {
        if (showValue && ref2.current) {
            ref2.current.innerText = `${showValue ? (max > 1 ? Math.round(value) : Math.round(100 * value) / 100) : ''} ${showValue ? unit : ""}`;
        }
    }, [showValue, max, value]);

    useEffect(() => {
        let _value = ((value - min) / (max - min)) * 100 + "%";

        if (ref1.current) {
            ref1.current.style.width = !isLine && isFullRadius ? _value : " ";
            ref1.current.style.height = isLine ? "2px" : _value;
            ref1.current.style.bottom = isLine ? _value : "0";
            ref1.current.style.backgroundColor = fillColor;
        }
        //setStyle(style);
    }, [isLine, max, isFullRadius, value, fillColor, min]);

    return React.useMemo(() => {
        return (<>
            <div ref={ref1}>
            </div >
            <div className="table absolute h-full w-full flex top-0 left-0 active:opacity-100 opacity-0 hover:opacity-100">
                <div ref={ref2} className="table absolute top-0 left-0 right-0 bottom-0 m-auto text-white ">
                    {/*showValue ? text : ''*/}
                </div>
            </div>
        </>);
    }, []);
};

export default MatrixInnerCell;
