import type { ObjectNode, Message } from "@/lib/nodes/types";
import { doc } from "../doc";

doc("onPatchResize", {
  description: "hook triggered when patch resizes",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});
export const onPatchResize = (_: ObjectNode) => {
  //node.isAsync = true;
  return (x: Message) => {
    console.log("on patch resize called");
    return [x];
  };
};
