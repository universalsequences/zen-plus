import type { Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "./doc";
import { getRootPatch } from "@/lib/nodes/traverse";

doc("sidebarOverlay", {
  description: "Shows/hides an object as a sidebar overlay",
  numberOfOutlets: 0,
  numberOfInlets: 1,
});

export const sidebarOverlay = (node: ObjectNode) => {
  node.skipCompilation = true;
  node.needsMainThread = true;
  // Set default attribute value
  if (!node.attributes.object) {
    node.attributes.object = "";
  }

  return (message: Message) => {
    const root = getRootPatch(node.patch);

    // Check if we have the required functions from SidebarContext
    if (!root.setSidebarObjects || !root.setCurrentSidebarObject || !root.setIsSidebarMinimized) {
      console.warn("sidebarOverlay: SidebarContext functions not available");
      return [];
    }

    const objectName = node.attributes.object as string;

    // If no object is specified, just toggle the sidebar visibility
    if (!objectName || objectName === "") {
      const shouldShow = Boolean(message);
      root.setIsSidebarMinimized(!shouldShow);
      return [];
    }

    // Find the object by scripting name using the root patch's scriptingNameToNodes map
    const objectsWithName = root.scriptingNameToNodes[objectName];

    if (!objectsWithName || objectsWithName.length === 0) {
      console.warn(`sidebarOverlay: Object with scripting name "${objectName}" not found`);
      return [];
    }

    // Use the first object if multiple objects have the same scripting name
    const targetObject = objectsWithName[0];

    const shouldShow = Boolean(message);

    if (shouldShow) {
      // Show the object in the sidebar
      root.setCurrentSidebarObject(targetObject);
      root.setIsSidebarMinimized(false);
    } else {
      // Hide the sidebar
      root.setIsSidebarMinimized(true);
    }

    return [];
  };
};
