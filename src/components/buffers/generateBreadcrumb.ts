import { Patch, SubPatch } from "@/lib/nodes/types";

/**
 * Generates a breadcrumb path for the current patch
 */
export const generateBreadcrumb = (currentPatch: Patch | null) => {
  if (!currentPatch) return "";

  let current: Patch | null = currentPatch;
  const parts: string[] = [];

  // Build path from current patch up through parents
  while (current) {
    const name = current.name || (!(current as SubPatch).parentPatch ? "Root Patch" : "Untitled");
    parts.unshift(name);
    // Move to parent if exists
    current = (current as SubPatch).parentPatch || null;
  }

  // Join with separator
  return parts.join(" > ");
};