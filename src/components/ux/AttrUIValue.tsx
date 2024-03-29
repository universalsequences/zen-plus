import React, { useState, useCallback, useEffect } from 'react';
import { useValue } from '@/contexts/ValueContext';
import NumberBox from './NumberBox';
import { Message, ObjectNode } from '@/lib/nodes/types';

const AttrUIValue: React.FC<{ lockedModeRef: React.MutableRefObject<boolean>, min: number, max: number, node: ObjectNode }> = ({ node, lockedModeRef, min, max }) => {
    let parsed = parseFloat((node.text.split(" ")[2]))
    let [value, setValue] = useState(!isNaN(parsed) ? parsed : 0);
    const onChangeValue = useCallback((num: number) => {
        let objectNode = node;
        setValue(num);
        let text = objectNode.text.split(" ");
        text[2] = num.toString();
        objectNode.text = text.join(" ");
        objectNode.arguments[1] = num;
        if (node && node.custom) {
            (node.custom as any).value = num;
        }
        let message: Message = text.slice(1).join(" ");
        objectNode.send(objectNode.outlets[0], message);
    }, [setValue]);


    let { value: message } = useValue();
    useEffect(() => {
        if (message !== null) {
            setValue(message as number);
        }
    }, [message, setValue]);

    return React.useMemo(() => {
        return (
            <NumberBox
                className="bg-zinc-900"
                round={false}
                isSelected={true}
                value={value}
                setValue={onChangeValue}
                min={min} max={max} lockedModeRef={lockedModeRef} />
        );
    }, [value, max, min]);
};

export default AttrUIValue;
