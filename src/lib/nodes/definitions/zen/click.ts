import { doc } from "./doc";
import { Operator, Statement, CompoundOperator } from "./types";
import { Lazy, ObjectNode, Message } from "../../types";
import { memoZen, memo } from "./memo";
import { Clicker, click, ParamGen, param } from "@/lib/zen/index";

doc("click", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  inletNames: ["trigger"],
  description: "sends a 1 for exactly one sample",
});
export const z_click = (node: ObjectNode) => {
  let clicker: Clicker;
  node.needsLoad = true;
  return (message: Message) => {
    if (!clicker) {
      clicker = click();
      node.click = clicker;
      let out: Statement = [{ name: "click", param: clicker }];
      out.node = node;
      return [out];
    }

    // otherwise we simply click
    if (!isNaN(parseFloat(message as string))) {
      message = parseFloat(message as string);
    }
    if (typeof message === "number") {
      clicker.click!(44100 * (message - node.patch.audioContext.currentTime));
    } else {
      clicker.click!();
    }
    return [];
  };
};
