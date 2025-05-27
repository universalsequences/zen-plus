import type { ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("zequencer.ui", {
  description: "UI for the zequencer node",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const zequencer_ui = (node: ObjectNode) => {
  node.needsUX = true;
  if (!node.attributes.target) {
    // serves as link to zequencer.core
    node.attributes.target = "";
  }
  if (!node.size) {
    node.size = { width: 200, height: 200 };
  }

  if (node.attributes.parameters === undefined) {
    node.attributes.parameters = false;
  }

  if (!node.attributes.stepOnColor) {
    node.attributes.stepOnColor = "#ffffff";
  }
  if (!node.attributes.stepOffColor) {
    node.attributes.stepOffColor = "#000000";
  }
  if (!node.attributes.stepBaseColor) {
    node.attributes.stepBaseColor = "#000000";
  }

  if (node.attributes.pianoRollHeight === undefined) {
    node.attributes.pianoRollHeight = 60; // Default height in pixels
  }

  node.isResizable = true;
  return () => {
    return [];
  };
};
