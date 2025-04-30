import { doc } from "./doc";
import { Operator, Statement, CompoundOperator } from "./types";
import { Lazy, ObjectNode, Message, OptimizedDataType } from "../../types";
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
  node.needsMainThread = true;
  node.needsLoad = true;
  node.inlets[0].optimizedDataType = [OptimizedDataType.NUMBER];

  return (message: Message) => {
    if (!clicker) {
      clicker = click();
      node.click = clicker;
      let out: Statement = [{ name: "click", param: clicker }];
      out.node = node;
      return [out];
    }

    // otherwise we simply click
    if (!Array.isArray(message) && !isNaN(parseFloat(message as string))) {
      message = parseFloat(message as string);
    }
    if (typeof message === "number") {
      clicker.click!(44100 * (message - (node.patch.audioContext?.currentTime || 0)));
    } else if (Array.isArray(message) && typeof message[0] === "number") {
      const time = 44100 * (message[0] - (node.patch.audioContext?.currentTime || 0));
      const invocation = message[1] as number;
      clicker.click!(time, 1, invocation);
    } else {
      clicker.click!();
    }
    return [];
  };
};
