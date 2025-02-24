import { doc } from "./doc";
import { ObjectNode } from "../../types";

doc("panel", {
  numberOfInlets: 0,
  numberOfOutlets: 0,
  description: "panel",
});

export const panel = (node: ObjectNode) => {
  node.isResizable = true;
  if (!node.attributes.backgroundColor) {
    node.attributes.backgroundColor = "#2f2f2f";
  }
  if (!node.size) {
    node.size = { width: 200, height: 200 };
  }
  return () => [];
};
