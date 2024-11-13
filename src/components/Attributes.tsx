import React, { useEffect, useCallback, useState } from "react";
import { OperatorContextType, getOperatorContext } from "@/lib/nodes/context";
import { ObjectNode, MessageNode } from "@/lib/nodes/types";
import Attribute from "./Attribute";
import { PatchDocComponent } from "./org/PatchDocComponent";
import { MinusCircledIcon, PlusCircledIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useStorage } from "@/contexts/StorageContext";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { getSubPatchType } from "./search/PatchesExplorer";
import { usePatches } from "@/contexts/PatchesContext";

const Attributes: React.FC<{ node: ObjectNode | MessageNode }> = ({ node }) => {
  const { fetchSubPatchForDoc } = useStorage();
  const { expandPatch } = usePatches();
  let attributes = node.attributes;
  let attributeNames = Object.keys(attributes);
  const [_inlets, setInlets] = useState(0);

  const doc =
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

  const [loadingExample, setLoadingExample] = useState(false);
  const openExample = useCallback(async () => {
    if (!doc?.examplePatch) return;
    setLoadingExample(true);
    // look up doc
    const serializedSubPatch = await fetchSubPatchForDoc(doc?.examplePatch);
    if (serializedSubPatch) {
      const type = serializedSubPatch.attributes?.type || "zen";
      const objectNode = new ObjectNodeImpl(node.patch);
      objectNode.parse(`zen @type ${type}`, OperatorContextType.ZEN, true, serializedSubPatch);
      objectNode.position = { x: 100, y: 100 };
      expandPatch(objectNode);

      setTimeout(() => {
        objectNode.subpatch?.recompileGraph(true);
      }, 1000);
      setLoadingExample(false);
    }
  }, [doc, node]);

  const removeInlet = useCallback(() => {
    const n = node as ObjectNode;
    const lastMessage = n.inlets[n.inlets.length - 1].lastMessage;
    n.inlets.splice(n.inlets.length - 1, 1);
    n.inlets[n.inlets.length - 1].lastMessage = lastMessage;
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
          {doc?.examplePatch && (
            <button
              onClick={openExample}
              className={`${loadingExample ? "opacity-50 pointer-events-none" : ""} flex px-2 py-1 cursor-pointer rounded-lg bg-zinc-200 text-zinc-500 gap-2 my-2 active:scale-105 active:text-zinc-400 transition-al`}
            >
              {loadingExample ? (
                " ... loading"
              ) : (
                <>
                  <QuestionMarkCircledIcon className="w-4 h-4" /> <div>help</div>
                </>
              )}
            </button>
          )}
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
