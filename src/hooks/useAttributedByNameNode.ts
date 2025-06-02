import { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { getRootPatch } from "@/lib/nodes/traverse";
import type { ObjectNode } from "@/lib/nodes/types";
import { useEffect, useState } from "react";

export const useAttributedByNameNode = (
  objectNode: ObjectNode,
  target: string,
  objectName: string,
) => {
  const [node, setNode] = useState<ObjectNode>();

  useEffect(() => {
    const rootPatch = getRootPatch(objectNode.patch) || objectNode.patch;
    const searchResult =
      rootPatch.scriptingNameToNodes[target]?.find((x) => x.name === objectName) || undefined;

    // Pass the full node to the UI, including the steps
    if (searchResult?.custom?.value) {
      // Ensure custom value is properly handled for polyphonic steps
      const customValue = searchResult.custom.value;

      if (Array.isArray(customValue) && customValue.length > 0) {
        if (Array.isArray(customValue[0])) {
          // Already in polyphonic format (array of arrays)
          searchResult.steps = customValue as GenericStepData[][];
        } else {
          // Convert legacy format (flat array) to polyphonic format
          searchResult.steps = customValue.map((step) =>
            Array.isArray(step) ? [step] : [step],
          ) as GenericStepData[][];
        }
      }
    }

    setNode(searchResult);
  }, [objectNode, target]);

  return { node };
};
