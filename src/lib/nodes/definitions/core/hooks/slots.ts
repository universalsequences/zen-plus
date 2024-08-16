import type { ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("getSlotNodes", {
  description: "gets slot nodes as list",
  numberOfOutlets: 1,
  numberOfInlets: 1,
});

export const getSlotNodes = (node: ObjectNode) => {
  return () => {
    const slotsObjects = node.patch.objectNodes.filter((x) => x.name === "slots~");

    for (const slots of slotsObjects) {
      if (slots.slots) {
        return [slots.slots];
      }
    }
    return [];
  };
};
