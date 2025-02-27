import type { Message, ObjectNode, Patch, Node } from "@/lib/nodes/types";
import { doc } from "../doc";
import { getRootPatch } from "@/lib/nodes/traverse";
import { isObjectNode } from "@/lib/nodes/vm/instructions";

doc("setPatchWindows", {
  description: "sets patch windows",
  numberOfOutlets: 0,
  numberOfInlets: 1,
});

export const setPatchWindows = (node: ObjectNode) => {
  return (nodes: Message) => {
    const root = getRootPatch(node.patch);
    if (root.setPatchWindows) {
      if (Array.isArray(nodes) && isObjectNode(nodes[0] as Node)) {
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

doc("setSideNodeWindow", {
  description: "sets node as side window in bar",
  numberOfOutlets: 0,
  numberOfInlets: 1,
});

export const setSideNodeWindow = (node: ObjectNode) => {
  return (node: Message) => {
    console.log("set side node window called", node);
    if (isObjectNode(node as Node)) {
      const objectNode = node as ObjectNode;
      const root = getRootPatch(objectNode.patch);
      if (root.setSideNodeWindow) {
        if (objectNode.subpatch) {
          objectNode.subpatch.lockedMode = true;
          objectNode.subpatch.presentationMode = true;
        }
        root.setSideNodeWindow(objectNode);
      }
    }
    return [];
  };
};
