import { createWorklet } from ".";
import { ConnectionType, type Message, type ObjectNode } from "../../types";
import { doc } from "./doc";

doc("mc.unpack~", {
  description: "split mc channel",
  numberOfInlets: 1,
  numberOfOutlets: (x) => x - 1,
});

export const mc_unpack = (node: ObjectNode) => {
  // check the args

  const chans = node.arguments.length;

  const ctx = node.patch.audioContext;

  node.inlets[0].mc = true;
  node.inlets[0].chans = chans;

  if (ctx) {
    if (node.merger) {
      node.merger.disconnect();
    }
    node.merger = ctx.createChannelMerger(chans);
    const gain = ctx.createGain();
    gain.gain.value = 1;

    node.merger.connect(gain);

    // we basically want to pipe all the elements
    if (!node.audioNode) {
      node.useAudioNode(gain);
    }
  }

  return () => {
    return [];
  };
};

doc("mc.voicer", {
  description: "split mc channel",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});

export const mc_voicer = (node: ObjectNode) => {
  if (node.attributes.chans === undefined) {
    node.attributes.chans = 6;
  }

  const listeners: AudioWorkletNode[] = [];

  const voiceActivities: number[] = [];

  const chans = node.attributes.chans as number;

  const ctx = node.patch.audioContext;

  node.inlets[0].mc = true;
  node.inlets[0].chans = chans;
  node.outlets[0].connectionType = ConnectionType.CORE;

  if (ctx) {
    if (node.merger) {
      node.merger.disconnect();
    }
    node.merger = ctx.createChannelMerger(chans);
    const splitter = ctx.createChannelSplitter(chans);

    node.merger.connect(splitter);

    const setup = async () => {
      listeners.length = 0;
      for (let i = 0; i < chans; i++) {
        await createWorklet(node, "/VisualizerWorklet.js", "visualizer-processor");
        const listener = node.audioNode as AudioWorkletNode;
        splitter.connect(listener, i, 0);
        listeners.push(listener);
        listener.port.onmessage = (e) => {
          voiceActivities[i] = e.data;
        };
      }
      node.useAudioNode(ctx.createGain());
    };
    setup();
  }

  return (message: Message) => {
    if (typeof message !== "number") return [];
    const frequency = message as number;
    return [[...voiceActivities]];
  };
};
