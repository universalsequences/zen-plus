import { doc } from "./doc";
import { Message, ObjectNode } from "../../types";

doc("waveform", {
  inletNames: [],
  description: "shows waveform",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const waveform = (node: ObjectNode) => {
  if (!node.size) {
    node.size = { width: 25, height: 25 };
  }
  return (_message: Message) => {
    // when it receives a
    if (node.onNewValue) {
      node.onNewValue(_message);
    }
    return [];
  };
};
