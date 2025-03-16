import { doc } from "./doc";
import { MutableValue } from "./MutableValue";
import { ObjectNode, Message } from "../../types";

doc("instructions.performance", {
  description: "displays the number of VM instructions being executed per second",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const instructionsPerformance = (node: ObjectNode) => {
  node.needsUX = true;
  node.isResizable = true;
  
  // Set default size if not provided
  if (!node.size) {
    node.size = {
      width: 120,
      height: 40,
    };
  }
  
  // Set default attributes if not provided
  if (!node.attributes.textColor) {
    node.attributes.textColor = "#ffffff";
  }
  if (!node.attributes.backgroundColor) {
    node.attributes.backgroundColor = "#000000";
  }

  // Create a custom MutableValue to store the current value
  if (!node.custom) {
    node.custom = new MutableValue(node);
    node.custom.value = 0;
  }
  
  return (message: Message) => {
    // Handle incoming messages if needed
    if (typeof message === "number") {
      node.custom.value = message;
    }
    
    return []; // No outputs from this node
  };
};