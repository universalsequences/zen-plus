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

// mc_voicer – revision 3  ("never steal while idle voices exist")
// ----------------------------------------------------------------------------
// Changes from rev‑2
// ➊  Stealing now happens *only* when the preset has already reached its
//     polyphony limit **activeForPreset ≥ K_P**.  If there is *any* idle voice
//     we will always pick one of those first.
// ➋  Priority within idle voices:
//       a) never‑used voices
//       b) idle voices that already hold the same preset
//       c) all remaining idle voices
// ➌  Added verbose DEBUG logs (toggle with DEBUG flag) so mismatches can be
//     traced in the console without editing the function again.
// ----------------------------------------------------------------------------

export const mc_voicer = (node: ObjectNode) => {
  /* ───── constants ───── */
  const RMS_THRESHOLD = 0.001; // ≈ –60 dB
  const DEBUG = false;
  const now = () => Date.now();

  /* ───── default attrs ───── */
  if (node.attributes.chans === undefined) node.attributes.chans = 6;
  if (node.attributes.field === undefined) node.attributes.field = "semitone";
  if (node.attributes.preset === undefined) node.attributes.preset = "";
  if (node.attributes.polyphony === undefined) node.attributes.polyphony = "";

  /* ───── data structures ───── */
  const chans: number = node.attributes.chans as number;
  const freqToVoice = new Map<string, number>();
  const voiceToFreq = new Map<number, number>();
  const voiceToPreset = new Map<number, number | null>();
  const voiceBusy: boolean[] = new Array(chans).fill(false);
  const voiceIdleAt: number[] = new Array(chans).fill(0);

  /* ───── audio wiring ───── */
  const ctx = node.patch.audioContext;
  node.inlets[0].mc = true;
  node.inlets[0].chans = chans;
  node.outlets[0].connectionType = ConnectionType.CORE;

  const voiceToRMS = new Array(chans).fill(0);

  // if (ctx) {
  //   if (!node.merger) node.merger = ctx.createChannelMerger(chans);
  //   const splitter = ctx.createChannelSplitter(chans);
  //   node.merger.connect(splitter);

  //   (async () => {
  //     console.log("initializing with chans=", chans);
  //     for (let i = 0; i < chans; i++) {
  //       await createWorklet(node, "/VisualizerWorklet.js", "visualizer-processor");
  //       const listener = node.audioNode as AudioWorkletNode;
  //       splitter.connect(listener, i, 0);

  //       listener.port.onmessage = ({ data }) => {
  //         const rms = typeof data === "number" ? data : data?.rms ?? 0;
  //         if (voiceBusy[i] && rms < RMS_THRESHOLD && now() - voiceIdleAt[i] > 50) {
  //           voiceBusy[i] = false;
  //           voiceIdleAt[i] = now();
  //           console.log("freeing voice=%s", i);
  //         }
  //         if (voiceBusy[i] && rms === 0) {
  //           console.log("rms=%s now() - voiceIdleAt[%s] -> %s", rms, i, now() - voiceIdleAt[i]);
  //         }
  //         voiceToRMS[i] = rms;
  //       };
  //       voiceToPreset.set(i, null);
  //       voiceIdleAt[i] = now();
  //     }
  //     node.useAudioNode(ctx.createGain());
  //   })();
  // }

  if (ctx) {
    if (!node.merger) node.merger = ctx.createChannelMerger(chans);

    (async () => {
      /* ── NEW: single multi-channel Visualizer ─────────────────────────────── */
      await ctx.audioWorklet.addModule("/MCVisualizerWorklet.js");

      const mcListener = new AudioWorkletNode(ctx, "mc-visualizer-processor", {
        numberOfInputs: 1, // we feed the merger’s output
        channelCount: chans, // keep all voices separate
        channelInterpretation: "discrete",
      });

      node.merger?.connect(mcListener);

      mcListener.port.onmessage = ({ data }) => {
        // data is Float32Array of per-voice RMS
        const rmsArray = data as Float32Array;
        for (let i = 0; i < chans; i++) {
          const rms = rmsArray[i] ?? 0;

          /* same busy-→-idle test you had before */
          if (voiceBusy[i] && rms < RMS_THRESHOLD && now() - voiceIdleAt[i] > 50) {
            voiceBusy[i] = false;
            voiceIdleAt[i] = now();
            if (DEBUG) console.log("freeing voice", i);
          }

          voiceToRMS[i] = rms; // keep if you still want it elsewhere
        }
      };

      /* ── keep the Splitter ONLY if other code still needs per-channel taps ── */
      // const splitter = ctx.createChannelSplitter(chans);
      // node.merger.connect(splitter);
      // … any other taps go here …

      node.useAudioNode(ctx.createGain());
    })();
  }

  /* ───── helper: choose least‑recently‑used, prefer mono presets ───── */
  const lru = (pool: number[]): number => {
    if (pool.length === 1) return pool[0];

    // Build polyphony lookup once per call
    const polyArr = (node.attributes.polyphony as number[]) ?? [];

    const mono: number[] = [];
    const poly: number[] = [];

    for (const v of pool) {
      const p = voiceToPreset.get(v);
      let kp = chans; // default (no limit)
      if (p !== null && p !== undefined && p >= 0 && p < polyArr.length) {
        kp = polyArr[p];
      }
      (kp === 1 ? mono : poly).push(v);
    }

    const bucket = mono.length ? mono : poly;
    const t = now();
    let oldest = bucket[0];
    let oldestAge = 0;
    for (const v of bucket) {
      const age = t - voiceIdleAt[v];
      if (age > oldestAge) {
        oldestAge = age;
        oldest = v;
      }
    }
    return oldest;
  };

  // /* ───── helper: choose least‑recently‑used from pool ───── */
  // const lru = (pool: number[]): number => {
  //   let vOld = pool[0];
  //   let ageOld = 0;
  //   const t = now();
  //   for (const v of pool) {
  //     const age = t - voiceIdleAt[v];
  //     if (age > ageOld) {
  //       ageOld = age;
  //       vOld = v;
  //     }
  //   }
  //   return vOld;
  // };

  /* ───── main callback ───── */
  return (_m: Message) => {
    if (typeof _m !== "object") return [];
    const m = _m as MessageObject;
    const freq = m[node.attributes.field as string] as number;
    const preset = "preset" in m ? (m.preset as number) : (node.attributes.preset as number);
    const poly = (node.attributes.polyphony as number[]) ?? [];
    const hasLimit = preset !== undefined && preset >= 0 && preset < poly.length;
    const K_P = hasLimit ? poly[preset] : chans; // unlimited → chans

    const key = `${preset}-${freq}`;

    /* -------- NOTE‑OFF -------- */
    if (m.type === "noteoff") {
      if (freqToVoice.has(key)) {
        const v = freqToVoice.get(key)!;
        freqToVoice.delete(key);
        voiceToFreq.delete(v);
        return [{ ...m, voice: v, time: m.time ?? ctx!.currentTime + 0.01 }];
      }
      return [];
    }

    /* -------- NOTE‑ON -------- */
    let vChosen: number | undefined;

    // a) same <preset,freq> already mapped *and* either mono or idle
    if (freqToVoice.has(key)) {
      const vPrev = freqToVoice.get(key)!;
      if (K_P === 1 || !voiceBusy[vPrev]) vChosen = vPrev;
    }

    if (vChosen === undefined) {
      const all = [...Array(chans).keys()];
      const idle = all.filter((v) => !voiceBusy[v]); // && voiceToRMS[v] < RMS_THRESHOLD);
      const brandNew = idle.filter((v) => voiceToPreset.get(v) === null);
      const idleSame = idle.filter((v) => voiceToPreset.get(v) === preset);
      const activeSame = all.filter((v) => voiceToPreset.get(v) === preset && voiceBusy[v]);

      /* 1 — Any idle voice available AND we have not hit poly‑limit? */
      if (idle.length && activeSame.length < K_P) {
        if (brandNew.length) {
          vChosen = lru(brandNew);
        } else if (idleSame.length) {
          vChosen = lru(idleSame);
        } else {
          vChosen = lru(idle);
          if (DEBUG)
            console.log(
              "stealing idle voice=%s prevPreset=%s currentPreset=%s busy->",
              vChosen,
              voiceToPreset.get(vChosen),
              preset,
              voiceBusy.filter((x) => x).length,
              [...voiceToRMS],
            );
        }
      } else {
        /* 2 — No idle voices or we’re at limit → we *must* steal */
        if (activeSame.length) {
          vChosen = lru(activeSame); // steal own preset first
        } else {
          vChosen = lru(all); // steal anyone (global LRU)
        }
      }
    }

    /* cleanup if we stole an in‑use voice */
    if (voiceToFreq.has(vChosen)) {
      for (const [k, v] of freqToVoice.entries()) if (v === vChosen) freqToVoice.delete(k);
      voiceToFreq.delete(vChosen);
    }

    /* map & mark busy */
    freqToVoice.set(key, vChosen);
    voiceToFreq.set(vChosen, freq);
    voiceToPreset.set(vChosen, preset);
    voiceBusy[vChosen] = true;
    voiceIdleAt[vChosen] = now();

    if (DEBUG)
      console.log(
        `[mc_voicer] note ${freq} preset ${preset} → voice ${vChosen} kp -> ${K_P} busy -> ${voiceBusy.filter((x) => x).length} ${[...voiceBusy]} voiceToRMS -> ${[...voiceToRMS]}`,
      );

    return [
      {
        ...m,
        voice: vChosen,
        time: m.time ?? ctx!.currentTime + 0.01,
      },
    ];
  };
};
