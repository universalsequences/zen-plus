import type { ObjectNode, Lazy } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("getNodesWithName", {
  description: "gets nodes with name as list",
  numberOfOutlets: 1,
  numberOfInlets: 2,
});

export const getNodesWithName = (node: ObjectNode, name: Lazy) => {
  return () => {
    const nodes = node.patch.objectNodes.filter(
      (x) => x.name === name() || x.subpatch?.name === name(),
    );

    if (!nodes.length) return [];
    return [nodes];
  };
};
