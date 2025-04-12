import { ObjectNode, Message } from "../../types";
import { doc } from "./doc";
import { MutableValue } from "./MutableValue";

doc("slider", {
  inletNames: ["operation"],
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "slider ui element",
});

export const slider = (node: ObjectNode) => {
  node.needsLoad = true;
  node.isResizable = true;

  if (!node.size) {
    node.size = {
      width: 20,
      height: 80,
    };
  }

  if (!node.attributes["fillColor"]) {
    node.attributes["fillColor"] = "#ff0000";
  }
  let custom: MutableValue;
  if (!node.custom) {
    custom = new MutableValue(node, 0);
    node.custom = custom;
  } else {
    custom = node.custom as MutableValue;
  }

  return (msg: Message) => {
    if (msg === "bang") {
      if (node.arguments[0] !== undefined) {
        custom.value = node.arguments[0];
        return [node.arguments[0]];
      }
    }
    if (typeof msg === "number") {
      custom.value = msg;
      return [msg];
    }
    return [msg];
  };
};

doc("knob", {
  inletNames: ["operation"],
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "knob ui element",
});

export const knob = (node: ObjectNode) => {
  node.needsLoad = true;
  node.isResizable = true;

  if (!node.size) {
    node.size = {
      width: 20,
      height: 80,
    };
  }
  let custom: MutableValue;
  if (!node.custom) {
    custom = new MutableValue(node, 0);
    node.custom = custom;
  } else {
    custom = node.custom as MutableValue;
  }

  if (!node.attributes["strokeColor"]) {
    node.attributes["strokeColor"] = "#ff0000";
  }

  return (msg: Message) => {
    if (msg === "bang") {
      if (node.arguments[0] !== undefined) {
        custom.value = node.arguments[0];
        return [node.arguments[0]];
      }
    }
    return [msg];
  };
};
