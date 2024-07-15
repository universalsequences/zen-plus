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
  if (!node.attributes.strokeColor) {
    node.attributes.strokeColor = "#000000";
  }
  if (!node.attributes.fillColor) {
    node.attributes.fillColor = "#ffffff";
  }
  if (!node.attributes.playIcon) {
    node.attributes.playIcon = false;
  }
  if (!node.attributes.text) {
    node.attributes.text = "";
  }

  if (!node.custom) {
    node.custom = new MutableValue(node);
    node.custom.value = 1;
  }
  return (message: Message) => {
    if (node.custom) {
      node.custom.value = node.custom.value ? 0 : 1;
      return [node.custom.value];
    }

    return [];
  };
};
