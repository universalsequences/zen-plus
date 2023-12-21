import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useSelection } from "@/contexts/SelectionContext";
import NumberBox from './NumberBox';
import { SubPatch, ObjectNode, Message } from '@/lib/nodes/types';

interface Option {
    label: string;
    value: ObjectNode | null;
}

const AttrUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let [options, setOptions] = useState<Option[]>([]);
    const { lockedMode } = useSelection();
    const lockedModeRef = useRef<boolean>(true);
    let [selectedOption, setSelectedOption] = useState<string | null>((objectNode.text.split(" ")[1] as string) || null);
    let parsed = parseFloat((objectNode.text.split(" ")[2]))
    let [value, setValue] = useState(!isNaN(parsed) ? parsed : 0);

    useEffect(() => {
        loadOptions();
    }, []);

    const loadOptions = useCallback(() => {
        let outbound = objectNode.outlets[0].connections.map(x => x.destination);
        let zenObjects: ObjectNode[] = (outbound as ObjectNode[]).filter(x => x.name === "zen");
        let subpatches = zenObjects.map(x => x.subpatch).filter(x => x) as SubPatch[];
        let allNodes = subpatches.flatMap(x => x.getAllNodes());
        let paramNodes = allNodes.filter(x => x.name === "param");
        if ((objectNode.patch as SubPatch).parentNode) {
            paramNodes = [...paramNodes, ...objectNode.patch.objectNodes.filter(
                x => x.name === "param")];

        }
        let parameterOptions = paramNodes.map(x => x.arguments[0]) as string[];
        let options: Option[] = [];
        for (let node of paramNodes) {
            let paramName = node.arguments[0] as string;
            if (!options.some(x => x.label === paramName)) {
                options.push({
                    label: paramName,
                    value: node
                });
            }
        }
        setOptions([{ label: "none", value: null }, ...options] as Option[]);
    }, [setOptions]);

    const onChangeOption = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === "none") {
            objectNode.text = "attrui";
            setSelectedOption(null);
            return;
        }
        setSelectedOption(e.target.value);
        let text = objectNode.text.split(" ");
        text[1] = e.target.value;
        objectNode.text = (text.join(" "));
    }, [setSelectedOption, options]);

    const onChangeValue = useCallback((num: number) => {
        setValue(num);
        let text = objectNode.text.split(" ");
        text[2] = num.toString();
        objectNode.text = text.join(" ");
        objectNode.arguments[1] = num;
        let message: Message = text.slice(1).join(" ");
        objectNode.send(objectNode.outlets[0], message);
    }, [setValue]);

    let found = (options.find(x => x.label === selectedOption)) as (Option | undefined);
    let node: ObjectNode | null = found ? (found.value) : null;
    return (
        <div
            onClick={() => loadOptions()} className={(lockedMode ? "" : " pointer-events-none ") + "flex h-8 bg-zinc-900 w-full flex-1 border-zinc-100"} >
            <select
                className="w-32 text-white bg-zinc-900 outline-none pl-1 mr-1"
                placeholder="none"
                value={(selectedOption as string) || "none"}
                onChange={onChangeOption}>
                {options.map(x => <option key={x.label} value={x.label}>{x.label}</option>)}
            </select>
            <div
                style={{ borderLeft: "1px solid white" }}
                className={(!selectedOption ? "pointer-events-none opacity-20" : "") + " h-full flex flex-col flex-1"}>
                <div className="my-auto w-full">
                    <NumberBox
                        className="bg-zinc-900"
                        round={false}
                        isSelected={true}
                        value={value}
                        setValue={onChangeValue}
                        min={node ? (node.attributes.min as number) || 0 : 0} max={node ? (node.attributes.max as number) || 1 : 1} lockedModeRef={lockedModeRef} />
                </div>
            </div>
        </div >
    );
}

export default AttrUI;
