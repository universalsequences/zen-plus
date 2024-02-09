import React, { useEffect, useState } from 'react';
import { ObjectNode } from '@/lib/nodes/types';
import { useMessage } from '@/contexts/MessageContext';

const MatrixInnerCell: React.FC<{ fillColor: string, max: number, cornerRadius: string, isFullRadius: boolean, showValue: boolean, unit: string, valueRef: React.MutableRefObject<number>, idx: number, objectNode: ObjectNode, isLine: boolean }> = ({ objectNode, isLine, idx, valueRef, unit, isFullRadius, cornerRadius, max, showValue, fillColor }) => {
    let [value, setValue] = useState(0);
    let { messages } = useMessage();
    useEffect(() => {
        if (objectNode.buffer) {
            setValue(objectNode.buffer[idx]);
            valueRef.current = objectNode.buffer[idx];
        }
    }, [setValue, (objectNode.buffer as Float32Array | Uint8Array)[idx]]);


    let [text, setText] = useState(`${showValue ? (max > 1 ? Math.round(value) : Math.round(100 * value) / 100) : ''} ${showValue ? unit : ""}`);
    let [style, setStyle] = useState({
        width: !isLine && isFullRadius ? (value / (max as number)) * 100 + "%" : " ",
        height: isLine ? "2px" : (value / (max as number)) * 100 + '%',
        bottom: isLine ? (value / (max as number)) * 100 + '%' : 0,
        backgroundColor: fillColor
    });
    let [className, setClassName] = useState(`${isLine ? "absolute w-full" : isFullRadius ? "m-auto" : "absolute bottom-0 w-full"} rounded-${cornerRadius}`);


    useEffect(() => {
        if (showValue) {
            setText(`${showValue ? (max > 1 ? Math.round(value) : Math.round(100 * value) / 100) : ''} ${showValue ? unit : ""}`);
        }
    }, [setText, showValue, max, value]);

    useEffect(() => {
        let _value = (value / (max as number)) * 100 + "%";
        let style = {

            width: !isLine && isFullRadius ? _value : " ",
            height: isLine ? "2px" : _value,
            bottom: isLine ? _value : 0,
            backgroundColor: fillColor
        };
        setStyle(style);
    }, [isLine, max, isFullRadius, value, fillColor, setStyle]);

    useEffect(() => {
        setClassName(`${isLine ? "absolute w-full" : isFullRadius ? "m-auto" : "absolute bottom-0 w-full"} rounded-${cornerRadius}`);
    }, [setClassName, isLine, isFullRadius, cornerRadius]);

    return React.useMemo(() => {
        return (<>
            <div style={style}
                className={className}>
            </div >
            <div className="table absolute top-0 left-0 right-0 bottom-0 m-auto text-white">
                {showValue ? text : ''}
            </div>
        </>);
    }, [isLine, style, showValue, className, text]);
};

export default MatrixInnerCell;
