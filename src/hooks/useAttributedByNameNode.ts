import type { ObjectNode } from "@/lib/nodes/types";
import { useEffect, useState } from "react";

export const useAttributedByNameNode = (
  objectNode: ObjectNode,
  name: string,
  objectName: string,
) => {
  const [node, setNode] = useState<ObjectNode>();

  useEffect(() => {
    const searchResult = objectNode.patch
      .getAllNodes()
      .find((_node) => _node.name === objectName && _node.attributes.name === name);
    setNode(searchResult);
  }, [objectNode, name]);

  return { node };
};
