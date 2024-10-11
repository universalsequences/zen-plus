import type { Message, NodeFunction, ObjectNode } from "../../types";
import { MutableValue } from "../core/MutableValue";
import { doc } from "./doc";

doc("live.meter~", {
  description: "meter attentuator",
  defaultValue: 0,
  numberOfInlets: 2,
  numberOfOutlets: 2,
});
export const live_meter: NodeFunction = (node: ObjectNode) => {
  if (!node.size) {
    node.size = {
      width: 30,
      height: 120,
    };
  }

  node.isResizable = true;

  let gainNode: GainNode;
  let analyser1: AnalyserNode;
  let analyser2: AnalyserNode;
  const splitter = node.patch.audioContext.createChannelSplitter(2);

  if (!node.audioNode) {
    gainNode = node.patch.audioContext.createGain();
    analyser1 = node.patch.audioContext.createAnalyser();
    analyser1.fftSize = 32;
    analyser2 = node.patch.audioContext.createAnalyser();
    analyser2.fftSize = 32;
    const merger = node.patch.audioContext.createChannelMerger(2);
    node.merger = merger;
    node.audioNode = gainNode;
    merger.connect(gainNode);
    node.auxAudioNodes = [analyser1, analyser2];

    gainNode.connect(splitter);
    splitter.connect(analyser1, 0);
    splitter.connect(analyser2, 1);
  }

  if (!node.custom) {
    node.custom = new MutableValue(node, 0);
  }

  return (message: Message) => {
    if (typeof message === "number" && gainNode) {
      gainNode.gain.linearRampToValueAtTime(message, node.patch.audioContext.currentTime + 0.01);
      if (node.custom) {
        node.custom.value = message;
      }
    }
    return [];
  };
};
