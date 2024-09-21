import React, { useEffect, useCallback, useState, useRef } from "react";
import { useLocked } from "@/contexts/LockedContext";
import AttrUIValue from "./AttrUIValue";
import { useSelection } from "@/contexts/SelectionContext";
import { SubPatch, ObjectNode, Message } from "@/lib/nodes/types";
import { getNodesControllableByAttriUI } from "../../lib/nodes/utils/getNodesControllableByAttriUI";

interface Option {
  label: string;
  value: ObjectNode | null;
}

const AttrUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let [options, setOptions] = useState<Option[]>([]);
  let { lockedMode } = useLocked();
  const lockedModeRef = useRef<boolean>(true);

  useEffect(() => {
    lockedModeRef.current = lockedMode;
  }, [lockedMode]);
  let [selectedOption, setSelectedOption] = useState<string | null>(
    (objectNode.text.split(" ")[1] as string) || null,
  );
  let parsed = parseFloat(objectNode.text.split(" ")[2]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = useCallback(() => {
    const paramNodes = getNodesControllableByAttriUI(objectNode);
    let options: Option[] = [];
    for (let node of paramNodes) {
      let paramName = (node as ObjectNode).arguments[0] as string;
      if (!options.some((x) => x.label === paramName)) {
        options.push({
          label: paramName,
          value: node as ObjectNode,
        });
      }
    }
    setOptions([{ label: "none", value: null }, ...options] as Option[]);
  }, [setOptions]);

  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "none") {
        objectNode.text = "attrui";
        setSelectedOption(null);
        return;
      }
      setSelectedOption(e.target.value);
      let text = objectNode.text.split(" ");
      text[1] = e.target.value;

      objectNode.text = text.join(" ");
      objectNode.controllingParamNode =
        options.find((x) => x.label === e.target.value)?.value || undefined;
    },
    [setSelectedOption, options],
  );

  let found = options.find((x) => x.label === selectedOption) as Option | undefined;
  let node: ObjectNode | null = found ? found.value : null;

  return React.useMemo(() => {
    return (
      <div
        onMouseDown={(e: any) => {
          if (lockedMode) {
            e.stopPropagation();
          }
        }}
        onClick={(e: any) => {
          loadOptions();
          if (lockedMode) {
            e.stopPropagation();
          }
        }}
        className={
          (lockedMode ? "" : " pointer-events-none ") +
          "flex h-6 flex-1 bg-zinc-900 w-full flex-1 border-zinc-100"
        }
      >
        <select
          className="w-full text-white bg-zinc-900 outline-none pl-1 mr-1 flex-1"
          placeholder="none"
          value={(selectedOption as string) || "none"}
          onChange={onChangeOption}
        >
          {options.map((x) => (
            <option key={x.label} value={x.label}>
              {x.label}
            </option>
          ))}
        </select>
        <div
          style={{ borderLeft: "1px solid #8d8787" }}
          className={
            (!selectedOption ? "pointer-events-none opacity-20" : "") + " h-full flex flex-col "
          }
        >
          <div className="my-auto w-full">
            <AttrUIValue
              max={node && node.attributes ? (node.attributes.max as number) || 1 : 1}
              node={objectNode}
              lockedModeRef={lockedModeRef}
              min={node && node.attributes ? (node.attributes.min as number) || 0 : 0}
            />
          </div>
        </div>
      </div>
    );
  }, [objectNode.attributes.min, lockedMode, selectedOption, objectNode.attributes.max, options]);
};

export default AttrUI;
