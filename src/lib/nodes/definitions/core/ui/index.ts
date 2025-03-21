import type { AttributeValue, Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("tab", {
  numberOfInlets: 1,
  numberOfOutlets: 2,
  inletNames: ["index"],
  outletNames: ["selected tab", "selected index"],
});
export const tab = (node: ObjectNode) => {
  node.needsMainThread = true;
  node.skipCompilation = true;

  if (!node.attributes["options"]) {
    node.attributes["options"] = "";
    node.attributeCallbacks.options = (value: AttributeValue) => {
      if (typeof value !== "string") return;
      const tokenized = value.split(",");
      // clear attributes related to options
      for (const option of tokenized) {
        // create a new attribute
      }
    };
  }

  return (message: Message) => {};
};
