import React, { useEffect, useCallback, useRef, useState } from "react";
import { getContextName } from "@/lib/nodes/context";
import { ContextDefinition } from "@/hooks/useAutoComplete";
import { Definition } from "@/lib/docs/docs";

const AutoCompletes: React.FC<{
  selected: number;
  selectOption: (x: ContextDefinition) => void;
  setAutoCompletes: (opt: ContextDefinition[]) => void;
  autoCompletes: ContextDefinition[];
}> = ({ selectOption, selected, autoCompletes, setAutoCompletes }) => {
  let ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo(0, selected * 24);
    }
  }, [selected]);
  if (autoCompletes.length === 0) {
    return <></>;
  }
  return (
    <div
      ref={ref}
      style={{
        backdropFilter: "blur(2px)",
        backgroundColor: "#59575721",
      }}
      className="-bottom-32  absolute h-32 left-0 w-96 overflow-x-hidden overflow-y-scroll bg-zinc-500 text-white border-zinc-400"
    >
      {autoCompletes.map((option, index) => (
        <div
          onClick={() => {
            selectOption(option);
            setAutoCompletes([]);
          }}
          key={index}
          className={(selected === index ? "bg-white text-black " : "") + " flex px-2 py-1 w-full"}
        >
          <div
            className={`autocomplete-option context-type-${option.context?.type} ${!option.context ? "bg-slate-200 text-black" : "text-white"} mr-1 px-1 rounded-full text-xs`}
          >
            {getContextName(option.context ? option.context.type : undefined) || "patch"}
          </div>
          <div className="flex-1">{option.definition.name}</div>
          <div
            className={
              (selected === index ? "text-zinc-700 " : "text-zinc-400 ") + "flex-1 ml-auto"
            }
          >
            {option.definition.description.trim()}{" "}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AutoCompletes;
