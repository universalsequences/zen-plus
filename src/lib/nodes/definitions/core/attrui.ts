import type { ObjectNode, Message, Lazy, NodeFunction } from "@/lib/nodes/types";
import { publish } from "@/lib/messaging/queue";
import { doc } from "./doc";
import { MutableValue } from "./MutableValue";
import { getNodesControllableByAttriUI } from "../../utils/getNodesControllableByAttriUI";

doc("attrui", {
  description: "control parameters/attribitues with ui",
  numberOfInlets: 3,
  numberOfOutlets: 1,
});

export const attrui: NodeFunction = (node: ObjectNode, name: Lazy, value: Lazy) => {
  node.needsLoad = true;

  let custom: MutableValue;
  if (!node.custom) {
    custom = new MutableValue(node, 1);
    node.custom = custom;
  } else {
    custom = node.custom as MutableValue;
  }

  if (!node.size) {
    node.size = { width: 100, height: 20 };
  }

  // node.inlets.forEach(x => x.hidden = true);
  return (_message: Message) => {
    if (!node.controllingParamNode) {
      const _name = name();
      const params = getNodesControllableByAttriUI(node, _name as string);
      node.controllingParamNode = params[0];
    }
    if (Array.isArray(_message)) {
      const [value, time] = _message;
      if (custom) {
        custom.value = value as number;
      }
      return [`${name()} ${value} ${time}`];
    }
    if (typeof _message === "number" && name()) {
      const msg = `${name()} ${value()}`;
      return [msg];
    }
    if (name() && value() !== undefined) {
      const msg = `${name()} ${value()}`;
      custom.value = value() as Message;
      return [msg];
    }
    if (name() && node.storedMessage !== undefined) {
      const msg = `${name()} ${node.storedMessage}`;
      custom.value = node.storedMessage;
      return [msg];
    }
    return [];
  };
};
