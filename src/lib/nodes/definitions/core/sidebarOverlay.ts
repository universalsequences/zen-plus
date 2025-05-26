import type { Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "./doc";
import { getRootPatch } from "@/lib/nodes/traverse";

doc("sidebarOverlay", {
  description: "Shows/hides an object as a sidebar overlay",
  numberOfOutlets: 1,
  numberOfInlets: 1,
  attributes: [
    {
      name: "object",
      type: "string",
      description: "Name of the object to show in the sidebar overlay",
      defaultValue: "",
    },
    {
      name: "disabled",
      type: "boolean",
      description:
        "When true, shows the icon as unselected even if the object is currently showing",
      defaultValue: false,
    },
  ],
});

export const sidebarOverlay = (node: ObjectNode) => {
  node.skipCompilation = true;
  node.needsMainThread = true;
  // Set default attribute values
  if (!node.attributes.object) {
    node.attributes.object = "";
  }
  if (node.attributes.disabled === undefined) {
    node.attributes.disabled = false;
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
      return [1];
    } else {
      // Hide the sidebar
      root.setIsSidebarMinimized(true);
      return [0];
    }
  };
};
