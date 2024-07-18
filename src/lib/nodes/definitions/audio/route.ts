import type { ObjectNode, Message } from "../../types";
import { doc } from "./doc";

doc("route~", {
  description: "route input to one of many outputs",
  defaultValue: 1,
  numberOfInlets: 1,
  numberOfOutlets: (x) => x,
});

export const route = (node: ObjectNode) => {
  const ctx = node.patch.audioContext;
  let outputMerger: ChannelMergerNode;

  const setup = (numberOfOutputs: number) => {
    console.log("setup called", numberOfOutputs, node.id);
    if (node.merger) {
      node.merger.disconnect();
    }

    console.log("creating outputMerger with =", numberOfOutputs);
    node.merger = ctx.createChannelMerger(1);
    outputMerger = ctx.createChannelMerger(numberOfOutputs);

    if (!node.audioNode) {
      node.useAudioNode(outputMerger);
    }

    if (node.audioNode) {
      node.merger.connect(outputMerger);
    }
  };

  if (!node.audioNode) {
    setup(node.outlets.length - 1);
  }

  let currentOutputIndex = 0;

  return (message: Message) => {
    if (typeof message === "number") {
      const index = message % node.outlets.length;

      if (index !== currentOutputIndex) {
        if (currentOutputIndex !== -1) {
          // Disconnect the current output
          node.merger?.disconnect(outputMerger, 0, currentOutputIndex);
        }
        // Connect the new output
        node.merger?.connect(outputMerger, 0, index);
        currentOutputIndex = index;
      }
    }
    return [];
  };
};
