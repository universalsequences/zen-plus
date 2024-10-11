import type { ObjectNode, Message, NodeFunction } from "../../types";
import { doc } from "./doc";

doc("comment", {
  numberOfOutlets: 0,
  numberOfInlets: 0,
  description: "comment your patch with this node",
});

export const comment: NodeFunction = (_node: ObjectNode) => {
  _node.isResizable = true;
  return (x: Message) => [];
};
