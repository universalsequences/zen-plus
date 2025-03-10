import React, { useEffect, useCallback, useState, useRef } from "react";
import { SketchPicker } from "react-color";
import { useSelection } from "@/contexts/SelectionContext";
import { MessageNode, ObjectNode, Message } from "@/lib/nodes/types";
import * as Checkbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";

interface Props {
  attribute: string;
  node: ObjectNode | MessageNode;
}

const Attribute = (props: Props) => {
  let { node, attribute } = props;
  let [value, setValue] = useState(node.attributes[attribute]);
  let { updateAttributes, attributesIndex, selectedNodes } = useSelection();
  let isString = useRef(isNaN(parseFloat(value as string)) && typeof value !== "boolean");

  const onChange = useCallback(
    (e: any) => {
      let _val = e.target.value;
      if (typeof _val === "string" && _val.includes(",")) {
        let toks = _val.split(",");
        if (toks.some((x) => x.includes("/"))) {
          updateValue(toks as string[]);
        } else {
          let tokens = _val.split(",").map(parseFloat) as number[];
          if (tokens.every((x) => !isNaN(x))) {
            updateValue(tokens);
            return;
          }
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
    },
    [setValue, node, attribute, updateAttributes],
  );

  const updateValue = useCallback(
    (val: string | number | boolean | number[] | string[]) => {
      // Check if multiple nodes are selected
      if (selectedNodes.length > 1) {
        // Filter nodes that contain the same attribute
        const nodesWithAttribute = selectedNodes.filter(
          (n) => n.attributes[attribute] !== undefined,
        );

        // If multiple nodes have this attribute, update them all
        if (nodesWithAttribute.length > 1) {
          for (const selectedNode of nodesWithAttribute) {
            selectedNode.setAttribute(attribute, val);
            selectedNode.patch.sendWorkerMessage?.({
              type: "setAttributeValue",
              body: {
                nodeId: selectedNode.id,
                key: attribute,
                value: val,
              },
            });
            selectedNode.attributes = { ...selectedNode.attributes };
            updateAttributes(selectedNode.id, selectedNode.attributes);
          }
        } else {
          // Just update the current node if it's the only one with this attribute
          node.setAttribute(attribute, val);
          node.patch.sendWorkerMessage?.({
            type: "setAttributeValue",
            body: {
              nodeId: node.id,
              key: attribute,
              value: val,
            },
          });
          node.attributes = { ...node.attributes };
          updateAttributes(node.id, node.attributes);
        }
      } else {
        // Single node update
        node.setAttribute(attribute, val);
        node.patch.sendWorkerMessage?.({
          type: "setAttributeValue",
          body: {
            nodeId: node.id,
            key: attribute,
            value: val,
          },
        });
        node.attributes = { ...node.attributes };
        updateAttributes(node.id, node.attributes);
      }
      setValue(val);
    },
    [setValue, node, attribute, updateAttributes, selectedNodes],
  );

  const onChangeOption = useCallback(
    (o: React.ChangeEvent<HTMLSelectElement>) => {
      updateValue(o.target.value);
    },
    [setValue, node],
  );

  let options = node.attributeOptions[attribute];
  let [opened, setOpened] = useState(false);
  return (
    <div className="flex p-2">
      <div className="mr-2 w-32">{attribute}</div>
      {typeof value === "string" && value.includes("#") ? (
        <div className="relative">
          <div
            onClick={() => setOpened(!opened)}
            style={{ backgroundColor: value }}
            className={
              (opened ? "border border-white" : "border-zinc-600 border") +
              " rounded-lg w-8 h-3 cursor-pointer"
            }
          />
          {opened && (
            <div className="absolute top-6 -right-12">
              <SketchPicker
                color={value}
                onChange={(c: any) => onChange({ target: { value: c.hex } })}
              />
            </div>
          )}
        </div>
      ) : options ? (
        <select className="text-white" value={value as string} onChange={onChangeOption}>
          {options.map((x) => (
            <option key={x} value={x as string}>
              {x}
            </option>
          ))}
        </select>
      ) : typeof value === "boolean" ? (
        <button
          onClick={() => updateValue(!value)}
          className="w-4 h-4 rounded-md border-2 bg-zinc-500"
        >
          {value && <CheckIcon />}
        </button>
      ) : (
        <input
          value={value as string}
          onChange={onChange}
          className="outline-none text-white  flex-1 text-center w-20 bg-black rounded-full px-1"
        ></input>
      )}
    </div>
  );
};

export default Attribute;
