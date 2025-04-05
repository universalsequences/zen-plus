import type { ObjectNode, Message } from "@/lib/nodes/types";
import { doc } from "../doc";
import { MutableValue } from "../MutableValue";

export type Dot = 0;
export type Dash = 1;
export type Atom =
  | Dot
  | Dash
  | {
      pattern: ETPattern;
      size: number;
    };

export type ETPattern = Atom[];

doc("et.editor", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "et editor",
  outletNames: ["pattern"],
});
export const et_editor = (node: ObjectNode) => {
  node.needsUX = true;
  node.size = { width: 200, height: 200 };
  node.isResizable = true;
  if (!node.custom) {
    node.custom = new MutableValue(node);
  }
  return (msg: Message) => {
    if (typeof msg === "string") {
      const parsed = JSON.parse(msg as string);
      (node.custom as MutableValue).value = parsed;
      return [parsed];
    } else {
      (node.custom as MutableValue).value = msg;
      return [msg];
    }
  };
};
