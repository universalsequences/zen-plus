import { doc } from "./doc";
import type { Message, ObjectNode } from "../../types";

doc("waveform", {
  inletNames: ["buffer"],
  description: "shows waveform",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const waveform = (node: ObjectNode) => {
  if (!node.size) {
    node.size = { width: 25, height: 25 };
  }
  if (!node.attributes.playhead) {
    node.attributes.playhead = 0;
  }
  node.isResizable = true;
  return (message: Message) => {
    if (node.onNewValue) {
      node.onNewValue(message);
    }
    if (ArrayBuffer.isView(message)) {
      node.buffer = message;
    }
    return [];
  };
};
