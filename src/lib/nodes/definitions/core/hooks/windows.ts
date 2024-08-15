import { Message, ObjectNode, Patch } from "@/lib/nodes/types";
import { doc } from "../doc";
import { getRootPatch } from "@/lib/nodes/traverse";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";

doc("setPatchWindows", {
  description: "sets patch windows",
  numberOfOutlets: 0,
  numberOfInlets: 1,
});

export const setPatchWindows = (node: ObjectNode) => {
  return (nodes: Message) => {
    const root = getRootPatch(node.patch);
    if (root.setPatchWindows) {
      if (Array.isArray(nodes) && nodes[0] instanceof ObjectNodeImpl) {
        const patches = nodes
          .filter((x) => (x as ObjectNode).attributes["Custom Presentation"])
          .map((x) => (x as ObjectNode).subpatch as Patch);
        for (const p of patches) {
          p.lockedMode = true;
          p.presentationMode = true;
        }
        root.setPatchWindows(patches);
      }
    }
    return [];
  };
};
