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
      className={`absolute ${numberCase ? "h-10 -bottom-10 p-2" : "h-48 -bottom-[196px]"} left-0  overflow-x-hidden overflow-y-scroll bg-zinc-500 text-white border-zinc-400`}
    >
      {isNumber(text) && groupTypes.length === 0 && (
        <div className="italic">hit enter to create a constant number</div>
      )}
      {text === "zen" && groupTypes.length === 1 && (
        <div className="p-2 italic">hit enter to create a subpatch</div>
      )}
      {groupTypes.map((type, idx) => (
        <div key={idx} className="flex flex-col">
          {groups.get(type)?.map((option, index) => (
            <div
              key={index}
              onClick={() => {
                selectOption(option);
                setAutoCompletes([]);
              }}
              style={{
                backgroundColor: selected === getIndex(idx, index) ? "#9fa3a426" : undefined,
              }}
              className={(selected === getIndex(idx, index) ? "" : "") + " flex px-2 py-1 w-full"}
            >
              <div className="w-10">
                <div
                  style={{ fontSize: 8 }}
                  className={`autocomplete-option context-type-${option.context?.type} ${!option.context ? "bg-zinc-900 text-white" : "text-white"} mr-1 px-1 rounded-full text-xs text-center`}
                >
                  {getContextName(option.context ? option.context.type : undefined) || "patch"}
                </div>
              </div>
              <div className="mr-5">
                {text === "p" && option.definition.aliases?.includes("p")
                  ? "p"
                  : option.definition.name}
              </div>
              <div
                style={{
                  color: selected === getIndex(idx, index) ? "white" : undefined,
                  maxWidth: 250,
                }}
                className={
                  (selected === getIndex(idx, index) ? "text-zinc-700 " : "text-zinc-400 ") +
                  "ml-auto break-words whitespace-pre-wrap table"
                }
              >
                {option.definition.description.trim()}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AutoCompletes;
