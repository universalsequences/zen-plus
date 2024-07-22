import type { ObjectNode } from "@/lib/nodes/types";
import { useEffect, useState } from "react";

export const useAttributedByNameNode = (
  objectNode: ObjectNode,
  name: string,
) => {
  const [node, setNode] = useState<ObjectNode>();

  useEffect(() => {
    const searchResult = objectNode.patch
      .getAllNodes()
      .find((_node) => _node.attributes.name === name);
    setNode(searchResult);
  }, [objectNode, name]);

  return { node };
};
