import { doc } from "./doc";
import { Statement } from "./types";
import { ObjectNode, Message, OptimizedDataType } from "../../types";
import { Clicker, click } from "@/lib/zen/index";

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
  if (!node.attributes.cancel) {
    node.attributes.cancel = false;
  }

  let invocationToUUID: { [x: number]: number[] } = {};

  return (message: Message) => {
    if (Array.isArray(message) && typeof message[1] === "string") {
      message[0] = parseInt(message[1]);
      message[1] = parseInt(message[1]);
    }
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

      if (time < 0) {
        console.log("negative time", node, message, node.patch.audioContext?.currentTime);
      }

      if (invocation !== undefined && invocationToUUID[invocation] && node.attributes.cancel) {
        for (const uuid of invocationToUUID[invocation]) {
          clicker.cancel?.(uuid);
        }
        invocationToUUID[invocation].length = 0;
      }
      const uuid = clicker.click!(time, 1, invocation);
      if (invocation !== undefined) {
        if (!invocationToUUID[invocation]) invocationToUUID[invocation] = [];
        invocationToUUID[invocation].push(uuid);
      }
    } else {
      clicker.click!();
    }
    return [];
  };
};
