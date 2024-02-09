import React, { useEffect, useCallback, useState, useRef } from 'react';
import { SketchPicker } from 'react-color'
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
        let _val = e.target.value;
        if (typeof _val === "string" && _val.includes(",")) {
            let tokens = _val.split(",").map(parseFloat) as number[];
            if (tokens.every(x => !isNaN(x))) {
                updateValue(tokens);
                return;
            }
        }
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

    const updateValue = useCallback((val: string | number | boolean | number[]) => {
        node.setAttribute(attribute, val);
        node.attributes = { ...node.attributes };
        updateAttributes(node.id, node.attributes);
        setValue(val);
    }, [setValue, node, attribute, updateAttributes]);

    const onChangeOption = useCallback((o: React.ChangeEvent<HTMLSelectElement>) => {
        updateValue(o.target.value);
    }, [setValue, node]);

    let options = node.attributeOptions[attribute];
    let [opened, setOpened] = useState(false);
    return (
        <div className="flex p-2">
            <div className="mr-2 w-32">{attribute}</div>
            {typeof value === "string" && value.includes("#") ?
                <div className="relative">
                    <div onClick={() => setOpened(!opened)} style={{ backgroundColor: value }} className={(opened ? "border border-white" : "border-zinc-600") + " rounded-lg w-8 h-3 cursor-pointer"} />
                    {opened && <div className="absolute top-6 -left-40"><SketchPicker color={value} onChange={(c: any) => onChange({ target: { value: c.hex } })} />
                    </div>
                    }
                </div>
                :

                options ?
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
