import { ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("zequencer.info", {
  description: "displays info of current step",
  numberOfInlets: 0,
  numberOfOutlets: 0,
});

export const zequencer_info = (node: ObjectNode) => {
  if (!node.size) {
    node.size = {
      width: 300,
      height: 300
    }
  }
  return () => {
    return [];
  };
};
