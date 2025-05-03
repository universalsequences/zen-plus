import type { ObjectNode, Message, Lazy, NodeFunction, MessageObject } from "@/lib/nodes/types";
import { publish } from "@/lib/messaging/queue";
import { doc } from "./doc";
import { MutableValue } from "./MutableValue";
import { getNodesControllableByAttriUI } from "../../utils/getNodesControllableByAttriUI";

doc("attrui", {
  description:
    "control parameters/attruibtes with a UI. Connect to a [[param]] or [[p]], to control specific values",
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

  node.isResizable = true;
  if (!node.size) {
    node.size = { width: 160, height: 20 };
  }

  // node.inlets.forEach(x => x.hidden = true);
  return (_message: Message) => {
    if (node.patch.isCompiling) {
      return [];
    }
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
    if (typeof _message === "object" && name()) {
      const obj = _message as MessageObject;
      const { value, voice, time } = obj;
      const msg = `${name()} ${value as number} ${time as number} ${voice as number}`;
      return [msg];
    }
    if (typeof _message === "number" && name()) {
      const msg = `${name()} ${_message}`;
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
