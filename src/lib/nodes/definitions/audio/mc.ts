import { createWorklet } from ".";
import { ConnectionType, MessageObject, type Message, type ObjectNode } from "../../types";
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
  if (node.attributes.field === undefined) {
    node.attributes.field = "semitone";
  }
  const listeners: AudioWorkletNode[] = [];
  const voiceActivities: number[] = [];
  const freqToVoiceMap = new Map<number, number>(); // Maps frequencies to voice indexes
  const voiceToFreqMap = new Map<number, number>(); // Maps voice indexes to frequencies
  const chans = node.attributes.chans as number;
  const ctx = node.patch.audioContext;
  node.inlets[0].mc = true;
  node.inlets[0].chans = chans;
  node.outlets[0].connectionType = ConnectionType.CORE;

  // Initialize voice activities array
  for (let i = 0; i < chans; i++) {
    voiceActivities[i] = 0;
  }

  if (ctx) {
    if (!node.merger) {
      node.merger = ctx.createChannelMerger(chans);
    }
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

  // Helper function to find the least active voice
  const findLeastActiveVoice = (): number => {
    let minActivity = -Infinity;
    let minIndex = 0;

    for (let i = 0; i < chans; i++) {
      const diff = new Date().getTime() - voiceTimestamps[i];
      if (diff > minActivity) {
        minActivity = diff;
        minIndex = i;
      }
    }

    return minIndex;
  };

  const voiceTimestamps: number[] = new Array(chans).fill(0);

  return (_message: Message) => {
    node.outlets[0].connectionType = ConnectionType.CORE;
    if (typeof _message !== "object") return [];
    const message = _message as MessageObject;

    const frequency = (message as MessageObject)[node.attributes.field as string] as number;

    if (message.type === "noteoff") {
      if (freqToVoiceMap.has(frequency)) {
        const voice = freqToVoiceMap.get(frequency) as number;
        const timestamp = voiceTimestamps[voice];
        setTimeout(() => {
          const newTimestamp = voiceTimestamps[voice];
          if (timestamp === newTimestamp) {
            freqToVoiceMap.delete(frequency);
          }
        }, 100);
        return [
          {
            ...message,
            time: message.time || node.patch.audioContext!.currentTime + 0.03,
            voice,
          },
        ];
      }
      return [];
    }

    let voiceChosen: number;

    // Check if this frequency is already mapped to a voice
    if (freqToVoiceMap.has(frequency)) {
      // Reuse the voice that's already playing this frequency
      voiceChosen = freqToVoiceMap.get(frequency)!;
    } else {
      // Find the first inactive voice
      const now = new Date().getTime();
      const inactiveVoice = voiceActivities.findIndex(
        (activity, i) => activity === 0 && now - voiceTimestamps[i] > 20,
      );

      if (inactiveVoice !== -1) {
        // Use the first inactive voice
        voiceChosen = inactiveVoice;
      } else {
        // If all voices are active, use the least active voice
        voiceChosen = findLeastActiveVoice();

        // Remove the old frequency mapping for this voice
        if (voiceToFreqMap.has(voiceChosen)) {
          const oldFreq = voiceToFreqMap.get(voiceChosen)!;
          freqToVoiceMap.delete(oldFreq);
        }
      }

      // Update mappings
      freqToVoiceMap.set(frequency, voiceChosen);
      voiceToFreqMap.set(voiceChosen, frequency);
    }

    voiceTimestamps[voiceChosen] = new Date().getTime();

    // Output the chosen voice
    return [
      {
        ...message,
        voice: voiceChosen,
        time: message.time || node.patch.audioContext!.currentTime,
      },
    ];
  };
};
