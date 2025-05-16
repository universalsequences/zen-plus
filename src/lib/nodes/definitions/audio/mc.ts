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
  // Default attribute settings
  if (node.attributes.chans === undefined) {
    node.attributes.chans = 6;
  }
  if (node.attributes.field === undefined) {
    node.attributes.field = "semitone";
  }
  if (node.attributes.preset === undefined) {
    node.attributes.preset = "";
  }
  if (node.attributes.polyphony === undefined) {
    node.attributes.polyphony = "";
  }

  const listeners: AudioWorkletNode[] = [];
  const voiceActivities: number[] = [];
  const freqToVoiceMap = new Map<string, number>(); // Maps "preset-frequency" to voice indexes
  const voiceToFreqMap = new Map<number, number>(); // Maps voice indexes to frequencies
  const voiceToPresetMap = new Map<number, number | null>(); // Maps voice indexes to their current preset or null
  const chans = node.attributes.chans as number;
  const ctx = node.patch.audioContext;
  node.inlets[0].mc = true;
  node.inlets[0].chans = chans;
  node.outlets[0].connectionType = ConnectionType.CORE;

  // Initialize voice activities and preset mappings
  for (let i = 0; i < chans; i++) {
    voiceActivities[i] = 0;
    voiceToPresetMap.set(i, null);
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

  const voiceTimestamps: number[] = new Array(chans).fill(0);

  // Helper function to find the least active voice among a list of voices
  const findLeastActiveVoice = (voices: number[]): number => {
    let maxDiff = -Infinity;
    let chosenVoice = voices[0];
    const now = new Date().getTime();
    for (const i of voices) {
      const diff = now - voiceTimestamps[i];
      if (diff > maxDiff) {
        maxDiff = diff;
        chosenVoice = i;
      }
    }
    return chosenVoice;
  };

  return (_message: Message) => {
    node.outlets[0].connectionType = ConnectionType.CORE;
    if (typeof _message !== "object") return [];
    const message = _message as MessageObject;
    const frequency = message[node.attributes.field as string] as number;
    const polyphony = (node.attributes.polyphony as number[]) || [];
    const preset =
      "preset" in message
        ? (message.preset as number)
        : (node.attributes.preset as number | undefined);
    const usePolyphony =
      polyphony.length > 0 && preset !== undefined && preset >= 0 && preset < polyphony.length;
    let K_P: number;
    if (usePolyphony) {
      K_P = polyphony[preset];
    } else {
      K_P = chans; // Default to total number of voices
    }

    const freqKey = `${preset}-${frequency}`;

    if (message.type === "noteoff") {
      if (freqToVoiceMap.has(freqKey)) {
        const voice = freqToVoiceMap.get(freqKey) as number;
        // Send noteoff message immediately
        const noteoffMessage = {
          ...message,
          time: message.time ? message.time : node.patch.audioContext!.currentTime + 0.01,
          voice,
        };
        // Immediately remove mappings
        freqToVoiceMap.delete(freqKey);
        voiceToFreqMap.delete(voice);
        if (!usePolyphony) {
          voiceToPresetMap.set(voice, null);
        }
        return [noteoffMessage];
      }
      return []; // No action if frequency not found
    }

    // Note-on handling
    let voiceChosen: number;
    const now = new Date().getTime();

    if (freqToVoiceMap.has(freqKey)) {
      voiceChosen = freqToVoiceMap.get(freqKey)!;
    } else {
      if (usePolyphony) {
        // Get voices currently assigned to the preset
        const voicesForP = Array.from({ length: chans }, (_, i) => i).filter(
          (i) => voiceToPresetMap.get(i) === preset,
        );

        if (K_P === 1 && voicesForP.length >= 1) {
          // Monophonic case: reuse the existing voice
          voiceChosen = voicesForP[0];
        } else if (voicesForP.length < K_P) {
          // Can allocate a new voice
          const freeVoices = Array.from({ length: chans }, (_, i) => i).filter(
            (i) => voiceToPresetMap.get(i) === null,
          );
          const inactiveFreeVoices = freeVoices.filter(
            (i) => voiceActivities[i] === 0 && now - voiceTimestamps[i] > 20,
          );

          if (inactiveFreeVoices.length > 0) {
            voiceChosen = inactiveFreeVoices[0];
          } else if (freeVoices.length > 0) {
            voiceChosen = findLeastActiveVoice(freeVoices);
          } else {
            // First try to steal from our own preset's voices
            const ownInactiveVoices = voicesForP.filter(
              (i) => voiceActivities[i] === 0 && now - voiceTimestamps[i] > 20,
            );

            if (ownInactiveVoices.length > 0) {
              voiceChosen = findLeastActiveVoice(ownInactiveVoices);
            } else if (voicesForP.length > 0) {
              voiceChosen = findLeastActiveVoice(voicesForP);
            } else {
              // Only as last resort, steal from other presets
              const otherVoices = Array.from({ length: chans }, (_, i) => i).filter(
                (i) => voiceToPresetMap.get(i) !== preset,
              );
              voiceChosen = findLeastActiveVoice(otherVoices);
            }
          }
        } else {
          // Polyphony limit reached, steal from preset's voices
          voiceChosen = findLeastActiveVoice(voicesForP);
        }
      } else {
        // No polyphony, use any inactive voice or least active
        const inactiveVoices = Array.from({ length: chans }, (_, i) => i).filter(
          (i) => voiceActivities[i] === 0 && now - voiceTimestamps[i] > 20,
        );
        if (inactiveVoices.length > 0) {
          voiceChosen = inactiveVoices[0];
        } else {
          voiceChosen = findLeastActiveVoice(Array.from({ length: chans }, (_, i) => i));
        }
      }

      // If the chosen voice was used by another frequency, remove that mapping
      if (voiceToFreqMap.has(voiceChosen)) {
        const oldFreq = voiceToFreqMap.get(voiceChosen)!;
        // Find and remove all freqKey entries that point to this voice
        for (const [key, value] of freqToVoiceMap.entries()) {
          if (value === voiceChosen) {
            freqToVoiceMap.delete(key);
          }
        }
      }

      // Update mappings
      freqToVoiceMap.set(freqKey, voiceChosen);
      voiceToFreqMap.set(voiceChosen, frequency);
      if (usePolyphony) {
        voiceToPresetMap.set(voiceChosen, preset);
      }
      voiceTimestamps[voiceChosen] = now;
    }

    // Output the chosen voice
    return [
      {
        ...message,
        voice: voiceChosen,
        time: message.time ? message.time : node.patch.audioContext!.currentTime + 0.01,
      },
    ];
  };
};
