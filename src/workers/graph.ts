import type { Node } from "@/lib/nodes/types";

type NodeMapping = {
  [x: string]: Node;
};

const idToNode: NodeMapping = {};

export const registerNode = (id: string, node: Node) => {
  idToNode[id] = node;
};
