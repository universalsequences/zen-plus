import type { Message, ObjectNode } from "../../types";
import { doc } from "./doc";

doc("oscilloscope~", {
  description: "meter attentuator",
  defaultValue: 1,
  numberOfInlets: 2,
  numberOfOutlets: 0,
});

export const oscilloscope = (node: ObjectNode) => {
  if (!node.size) {
    node.size = {
      width: 100,
      height: 100,
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
    analyser1.fftSize = 512;
    analyser2 = node.patch.audioContext.createAnalyser();
    analyser2.fftSize = 512;
    const merger = node.patch.audioContext.createChannelMerger(2);
    node.merger = merger;
    node.audioNode = gainNode;
    merger.connect(gainNode);
    node.auxAudioNodes = [analyser1, analyser2];

    gainNode.connect(splitter);
    splitter.connect(analyser1, 0);
    splitter.connect(analyser2, 1);
  }

  return (_message: Message) => {
    return [];
  };
};
