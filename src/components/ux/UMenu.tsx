import React, { useEffect, useCallback, useState } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { ObjectNode } from '@/lib/nodes/types';

const UMenu: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const { lockedMode } = useSelection();
    let [selectedOption, setSelectedOption] = useState(objectNode.storedMessage as string || "");
    let options = (objectNode.attributes["options"] as string).split(",");

    const onChangeOption = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedOption(e.target.value);
        objectNode.receive(objectNode.inlets[0], e.target.value);
    }, [setSelectedOption]);
    return (<div
        onMouseDown={(e: any) => {
            if (lockedMode) {
                e.stopPropagation();
            }
        }}
        className={"text-base bg-zinc-900 p-1" + (lockedMode ? "" : " pointer-events-none")}>
        <select
            className="w-32 text-white bg-zinc-900 outline-none pl-1 mr-1"
            placeholder="none"
            value={(selectedOption as string) || "none"}
            onChange={onChangeOption}>
            {options.map((x, i) => <option key={i} value={x}>{x}</option>)}
        </select>
    </div>);
}
export default (UMenu);
