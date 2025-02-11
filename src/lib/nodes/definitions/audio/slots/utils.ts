import type { Message, NodeFunction, ObjectNode, SubPatch } from "@/lib/nodes/types";
import { doc } from "@/lib/nodes/definitions/core/doc";

doc("slotsout", {
  description: "send a message to a slot",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const slotsout: NodeFunction = (node: ObjectNode) => {
  return (message: Message) => {
    // send message out of outer slot
    let currentPatch = node.patch as SubPatch;
    while (!currentPatch.isInsideSlot) {
      currentPatch = currentPatch.parentPatch as SubPatch;
    }
    if (currentPatch.parentNode.parentSlots) {
      const slots = currentPatch.parentNode.parentSlots;
      slots.send(slots.outlets[0], message);
    }
    return [];
  };
};
