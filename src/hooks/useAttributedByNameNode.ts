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
    
    // Pass the full node to the UI, including the steps
    if (searchResult?.custom?.value) {
      // Ensure custom value is properly handled for polyphonic steps
      const customValue = searchResult.custom.value;
      
      if (Array.isArray(customValue) && customValue.length > 0) {
        if (Array.isArray(customValue[0])) {
          // Already in polyphonic format (array of arrays)
          searchResult.steps = customValue;
        } else {
          // Convert legacy format (flat array) to polyphonic format
          searchResult.steps = customValue.map(step => 
            Array.isArray(step) ? [step] : [step]
          );
        }
      }
    }
    
    setNode(searchResult);
  }, [objectNode, name]);

  return { node };
};
