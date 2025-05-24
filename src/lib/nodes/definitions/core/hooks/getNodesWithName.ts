import type { ObjectNode, Lazy, SubPatch } from "@/lib/nodes/types";
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

doc("getCurrentSubPatch", {
  description: "gets the current subpatch as an ojbect",
  numberOfOutlets: 2,
  numberOfInlets: 1,
  outletNames: ["id", "name"],
});

export const getCurrentSubPatch = (node: ObjectNode) => {
  node.skipCompilation = true;
  node.needsMainThread = true;
  return () => {
    console.log("received getCurrentSubPatch", node);
    return [
      (node.patch as SubPatch).parentNode?.id || node.patch.id,
      (node.patch as SubPatch).name,
    ];
  };
};
