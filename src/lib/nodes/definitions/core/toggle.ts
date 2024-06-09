import { doc } from "./doc";
import { MutableValue } from "./MutableValue";
import { ObjectNode, Message } from "../../types";

doc("toggle", {
  description: "ui element for toggling 1/0",
  numberOfInlets: 1,
  numberOfOutlets: 1,
  outletNames: ["toggle value"],
});

export const toggle = (node: ObjectNode) => {
  node.isResizable = true;
  if (!node.size) {
    node.size = {
      width: 80,
      height: 80,
    };
  }
  if (!node.custom) {
    node.custom = new MutableValue(node);
    node.custom.value = 1;
  }
  console.log("TOGGLE CUSTOM=", node.custom);
  return (message: Message) => {
    if (node.custom) {
      node.custom.value = node.custom.value ? 0 : 1;
      return [node.custom.value];
    }

    return [];
  };
};
