import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { MessageNode, ObjectNode, Message } from "@/lib/nodes/types";

interface Props {
    attribute: string;
    node: ObjectNode | MessageNode;
}

const Attribute = (props: Props) => {
    let { node, attribute } = props;
    let [value, setValue] = useState(node.attributes[attribute]);
    let { updateAttributes, attributesIndex } = useSelection();
    let isString = useRef(isNaN(parseFloat(value as string)) && typeof value !== "boolean");

    const onChange = useCallback((e: any) => {
        if (isString.current) {
            let val = e.target.value;
            updateValue(val);
            return;
        }
        let val = parseInt(e.target.value);
        if (!isNaN(val)) {
            updateValue(val);
        }
    }, [setValue, node, attribute, updateAttributes]);

    const updateValue = useCallback((val: string | number | boolean) => {
        node.setAttribute(attribute, val);
        node.attributes = { ...node.attributes };
        updateAttributes(node.id, node.attributes);
        setValue(val);
    }, [setValue, node, attribute, updateAttributes]);

    const onChangeOption = useCallback((o: React.ChangeEvent<HTMLSelectElement>) => {
        updateValue(o.target.value);
    }, [setValue, node]);

    let options = node.attributeOptions[attribute];
    return (
        <div className="flex p-2">
            <div className="mr-2 w-32">{attribute}</div>
            {options ?
                <select
                    className="text-white"
                    value={value as string}
                    onChange={onChangeOption}>
                    {options.map(x => <option key={x} value={x as string}>{x}</option>)}
                </select>
                : <input
                    value={value === true ? 1 : value === false ? 0 : value as string}
                    onChange={onChange}
                    className="outline-none text-white  flex-1 text-center w-20 bg-black rounded-full px-1"></input>}
        </div>);
}

export default Attribute;
