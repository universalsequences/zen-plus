import React, { useEffect, useCallback, useState } from "react";
import { getOperatorContext } from "@/lib/nodes/context";
import { ObjectNode, MessageNode } from "@/lib/nodes/types";
import Attribute from "./Attribute";
import { useSelection } from "@/contexts/SelectionContext";
import { PatchDocComponent } from "./org/PatchDocComponent";
import { MinusCircledIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { usePosition } from "@/contexts/PositionContext";

const Attributes: React.FC<{ node: ObjectNode | MessageNode }> = ({ node }) => {
  let attributes = node.attributes;
  let attributeNames = Object.keys(attributes);
  const [inlets, setInlets] = useState(0);

  let doc =
    (node as ObjectNode).operatorContextType !== undefined
      ? getOperatorContext((node as ObjectNode).operatorContextType).lookupDoc(
          (node as ObjectNode).name || "",
        )
      : undefined;

  const updateText = (n: ObjectNode) => {
    if (n.text.includes("lisp")) {
      n.text =
        "lisp " +
        new Array(n.inlets.length - 2)
          .fill(0)
          .map((x) => "0")
          .join(" ");
    }
    setInlets(n.inlets.length);
  };

  const addInlet = useCallback(() => {
    const n = node as ObjectNode;
    n.newInlet();
    n.inlets[n.inlets.length - 1].lastMessage = n.inlets[n.inlets.length - 2].lastMessage;
    updateText(n);
  }, [node]);

  const removeInlet = useCallback(() => {
    const n = node as ObjectNode;
    const lastMessage = n.inlets[n.inlets.length - 1].lastMessage;
    n.inlets.splice(n.inlets.length - 1, 1);
    n.inlets[n.inlets.length - 1].lastMessage = lastMessage ;
    updateText(n);
  }, [node]);

  const hasDynamicInlets = (node as ObjectNode).hasDynamicInlets;
  return (
    <div onClick={(e: any) => e.stopPropagation()} className=" p-1">
      <div className="w-full h-full text-xs">
        <div style={{ borderBottom: "1px solid #4f4f4f" }} className="p-2 w-full text-xs">
          <div className="text-base">
            {(node as ObjectNode).name} ( {node.id} )
          </div>
          {doc && <div className="mt-2 w-52">{doc.description}</div>}
        </div>

        {hasDynamicInlets && (
          <div className="flex">
            <button
              onClick={addInlet}
              className="flex px-2 py-1 rounded-lg bg-zinc-200 text-zinc-500 gap-2 ml-2 my-2 active:scale-105 active:text-zinc-400 transition-all"
            >
              <PlusCircledIcon className="w-4 h-4" /> inlet
            </button>
            <button
              disabled={node.inlets.length <= 2}
              onClick={removeInlet}
              className={`${node.inlets.length <= 2 ? "pointer-events-none opacity-20" : ""} flex px-2 py-1 rounded-lg bg-zinc-200 text-zinc-500 gap-2 ml-2 my-2 active:scale-105 active:text-zinc-400 transition-all`}
            >
              <MinusCircledIcon className="w-4 h-4" /> inlet
            </button>
          </div>
        )}
        <PatchDocComponent node={node as ObjectNode} />

        <div style={{ maxHeight: "78vh" }} className="w-full flex-1 overflow-y-scroll pb-72 ">
          {attributeNames.map((attribute, i) => (
            <Attribute key={i} attribute={attribute} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
};
export default Attributes;
