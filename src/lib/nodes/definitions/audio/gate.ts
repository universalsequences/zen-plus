import type { Message, NodeFunction, ObjectNode } from "../../types";
import { MutableValue } from "../core/MutableValue";
import { doc } from "./doc";

doc("gate~", {
  description: "meter attentuator",
  defaultValue: 1,
  numberOfInlets: (x) => x,
  numberOfOutlets: 1,
});

export const gate: NodeFunction = (node: ObjectNode) => {
  const gainNodes: GainNode[] = [];
  const ctx = node.patch.audioContext;
  let splitter: ChannelSplitterNode;
  const setup = (numberOfInputs: number) => {
    if (node.merger) {
      node.merger.disconnect();
    }
    node.merger = ctx.createChannelMerger(numberOfInputs + 1);

    splitter = ctx.createChannelSplitter(numberOfInputs + 1);
    node.merger.connect(splitter);

    if (!node.audioNode) {
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      node.useAudioNode(gainNode);
    }
    if (node.audioNode) {
      node.merger.connect(node.audioNode);
    }

    const outputNode = ctx.createGain();
    outputNode.gain.value = 1;
    for (let i = gainNodes.length; i < numberOfInputs; i++) {
      const gainNode = ctx.createGain();
      gainNodes.push(gainNode);
    }
    for (let i = 0; i < numberOfInputs; i++) {
      splitter.connect(gainNodes[i], i + 1, 0);
      gainNodes[i].connect(outputNode);
    }
    node.useAudioNode(outputNode);
  };

  setup(node.inlets.length - 1);

  return (message: Message) => {
    if (typeof message === "number") {
      const index = message % gainNodes.length;
      for (let i = 0; i < gainNodes.length; i++) {
        const gainValue = i === index ? 1 : 0;
        console.log("setting gain", i, gainValue);
        gainNodes[i].gain.linearRampToValueAtTime(
          gainValue,
          node.patch.audioContext.currentTime + 0.01,
        );
      }
    }
    return [];
  };
};

doc("route~", {
  description: "route input to one of many outputs",
  defaultValue: 1,
  numberOfInlets: 1,
  numberOfOutlets: (x) => x,
});

export const route: NodeFunction = (node: ObjectNode) => {
  const gainNodes: GainNode[] = [];
  const ctx = node.patch.audioContext;
  let merger: ChannelMergerNode;

  const setup = (numberOfOutputs: number) => {
    if (node.merger) {
      node.merger.disconnect();
    }

    node.merger = ctx.createChannelMerger(1);
    merger = ctx.createChannelMerger(numberOfOutputs);

    if (!node.audioNode) {
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1;
      node.useAudioNode(gainNode);
    }

    if (node.audioNode) {
      node.merger.connect(node.audioNode);
      node.audioNode.connect(merger);
    }

    const outputMerger = ctx.createChannelMerger(numberOfOutputs);
    for (let i = gainNodes.length; i < numberOfOutputs; i++) {
      const gainNode = ctx.createGain();
      gainNodes.push(gainNode);
    }

    for (let i = 0; i < numberOfOutputs; i++) {
      merger.connect(gainNodes[i], 0, i);
      gainNodes[i].connect(outputMerger);
    }

    node.useAudioNode(outputMerger);
  };

  setup(node.outlets.length - 1);

  return (message: Message) => {
    if (typeof message === "number") {
      const index = message % gainNodes.length;
      for (let i = 0; i < gainNodes.length; i++) {
        const gainValue = i === index ? 1 : 0;
        console.log("setting gain", i, gainValue);
        gainNodes[i].gain.linearRampToValueAtTime(
          gainValue,
          node.patch.audioContext.currentTime + 0.01,
        );
      }
    }
    return [];
  };
};
