import React, { useEffect, useCallback, useRef, useState } from "react";
import { OperatorContextType, getContextName } from "@/lib/nodes/context";
import { ContextDefinition } from "@/hooks/useAutoComplete";
import { Definition } from "@/lib/docs/docs";
import { isNumber } from "@/utils/isNumber";

const AutoCompletes: React.FC<{
  text: string;
  selected: number;
  selectOption: (x: ContextDefinition) => void;
  setAutoCompletes: (opt: ContextDefinition[]) => void;
  autoCompletes: ContextDefinition[];
}> = ({ text, selectOption, selected, autoCompletes, setAutoCompletes }) => {
  let ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo(0, selected * 24);
    }
  }, [selected]);

  if (autoCompletes.length === 0 && !isNumber(text)) {
    return <></>;
  }

  const groups: Map<string, ContextDefinition[]> = new Map();
  const patches: ContextDefinition[] = [];
  const groupTypes: string[] = [];
  for (const autocomplete of autoCompletes) {
    const type =
      autocomplete.context?.type !== undefined
        ? getContextName(autocomplete.context?.type)
        : "patch";
    if (type) {
      if (!groups.get(type)) {
        groups.set(type, []);
        groupTypes.push(type);
      }
      groups.get(type)?.push(autocomplete);
    }
  }

  const getIndex = (idx: number, index: number) => {
    let i = 0;
    for (let type of groupTypes.slice(0, idx)) {
      let len = groups.get(type)?.length || 0;
      i += len;
    }
    return i + index;
  };
  const numberCase = isNumber(text) && groupTypes.length === 0;
  return (
    <div
      ref={ref}
      style={{
        backdropFilter: "blur(2px)",
        backgroundColor: "#59575721",
        width: numberCase ? 250 : 400,
      }}
      className={`absolute ${numberCase ? "h-10 -bottom-10 p-2" : "h-48 -bottom-48"} left-0  overflow-x-hidden overflow-y-scroll bg-zinc-500 text-white border-zinc-400`}
    >
      {isNumber(text) && groupTypes.length === 0 && (
        <div className="italic">hit enter to create a constant number</div>
      )}
      {groupTypes.map((type, idx) => (
        <div className="flex flex-col">
          <div className="text-base p-2">{type}</div>
          {groups.get(type)?.map((option, index) => (
            <div
              onClick={() => {
                selectOption(option);
                setAutoCompletes([]);
              }}
              key={index}
              className={
                (selected === getIndex(idx, index) ? "bg-white text-black " : "") +
                " flex px-2 py-1 w-full"
              }
            >
              <div
                className={`autocomplete-option context-type-${option.context?.type} ${!option.context ? "bg-rainbow text-black" : "text-white"} mr-1 px-1 rounded-full text-xs`}
              >
                {getContextName(option.context ? option.context.type : undefined) || "patch"}
              </div>
              <div className="flex-1">{option.definition.name}</div>
              <div
                className={
                  (selected === getIndex(idx, index) ? "text-zinc-700 " : "text-zinc-400 ") +
                  "flex-1 ml-auto"
                }
              >
                {option.definition.description.trim()}{" "}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AutoCompletes;
