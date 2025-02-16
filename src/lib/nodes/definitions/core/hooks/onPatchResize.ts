import { ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("onPatchResize", {
  description: "hook triggered when patch resizes",
  numberOfInlets: 0,
  numberOfOutlets: 1,
});
export const onPatchResize = (node: ObjectNode) => {
  node.isAsync = true;
  return () => ["bang"];
};
