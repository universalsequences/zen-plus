import { ObjectNode } from "@/lib/nodes/types";
import { Patch } from "@/lib/nodes/types";

/**
 * Organizes objects into subpatches and regular objects, with filtering
 */
export const organizeObjects = (currentPatch: Patch | null, searchTerm: string) => {
  if (!currentPatch) return { subpatches: [], regularObjects: [] };

  const subpatches: ObjectNode[] = [];
  const regularObjects: ObjectNode[] = [];

  const normalizedSearchTerm = searchTerm.toLowerCase();

  currentPatch.objectNodes.forEach((node) => {
    // Filter based on command text if there is any
    const nodeText = (node.text || "").toLowerCase();
    const subpatchName = node.subpatch ? (node.subpatch.name || "").toLowerCase() : "";

    // Skip if search term doesn't match
    if (normalizedSearchTerm && !nodeText.includes(normalizedSearchTerm) && !subpatchName.includes(normalizedSearchTerm)) {
      return;
    }

    if (node.subpatch) {
      subpatches.push(node);
    } else {
      regularObjects.push(node);
    }
  });

  return { subpatches, regularObjects };
};