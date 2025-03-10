import { doc } from "../doc";
import { click, Clicker, ParamGen, param } from "@/lib/zen/index";
import { getDefunBodies } from "../defun-utils";
import { Message, Lazy, ObjectNode } from "../../../types";
import type { CompoundOperator, Operator, Statement } from "../types";
import { object, number, optional, parse, InferOutput } from "valibot";

doc("polytrig", {
  description:
    "receives trigger messages and chooses voices to trigger, passing values from the trigger messages to arguments as parameters",
  numberOfInlets: (x: number) => x,
  numberOfOutlets: 1,
  inletNames: ["trig", "arg1 field", "arg2 field", "arg3 field", "arg4 field"],
  attributeOptions: {
    mode: ["sum", "pipe"],
  },
});

type Mode = "pipe" | "sum";

type VoiceParam = {
  name: string;
  param: ParamGen;
};

interface Voice {
  trigger: Clicker;
  params: VoiceParam[];
  lastTriggerTime?: number;
  lastTriggerDuration?: number;
}

const createTriggerSchema = (argNames: string[]) => {
  const schemaObj: Record<string, any> = {
    time: number(),
    duration: optional(number()),
  };

  argNames.forEach((argName) => {
    schemaObj[argName] = optional(number());
  });

  return object(schemaObj);
};

export const polytrig = (node: ObjectNode, ...args: Lazy[]) => {
  node.needsMainThread = true;
  if (!node.attributes.voices) {
    node.attributes.voices = 6;
  }

  if (!node.attributes["mode"]) {
    node.attributes["mode"] = "sum" as Mode;
  }

  const argNames = args.map((arg) => arg() as string);
  const triggerSchema = createTriggerSchema(argNames);

  type TriggerMessage = InferOutput<typeof triggerSchema>;

  const handleTrigger = (trigger: Message) => {
    try {
      const validatedTrigger: TriggerMessage = parse(triggerSchema, trigger);

      // Handle string triggers (kept from original)
      if (typeof trigger === "string") {
        if (voices[0]) {
          voices[0].trigger.click!();
        }
        return;
      }

      const time = validatedTrigger.time;
      const dur = validatedTrigger.duration;
      const currentTime = node.patch.audioContext?.currentTime as number;
      let voiceChosen: Voice | undefined;

      // First pass: Look for voices that have never been triggered
      // or voices that are definitely past their note duration
      for (const voice of voices) {
        if (
          !voice.lastTriggerTime ||
          (voice.lastTriggerTime &&
            voice.lastTriggerDuration &&
            time > voice.lastTriggerTime + voice.lastTriggerDuration)
        ) {
          voiceChosen = voice;
          break;
        }
      }

      // Second pass: If no free voice found, use a more sophisticated selection
      if (!voiceChosen) {
        let bestScore = -Infinity;
        let earliestEndTime = Infinity;

        for (const voice of voices) {
          // Calculate when this voice's current note ends
          const endTime = voice.lastTriggerTime! + (voice.lastTriggerDuration || 0);

          // Calculate a score based on multiple factors
          let score = 0;

          // Factor 1: How soon will this voice be free?
          const timeUntilFree = Math.max(0, endTime - time);
          score -= timeUntilFree * 100; // Heavily weight voices that will be free sooner

          // Factor 2: Prefer voices that have been playing longer
          score -= (currentTime - voice.lastTriggerTime!) * 50;

          // Factor 3: Prefer voices with shorter remaining durations
          if (voice.lastTriggerDuration) {
            const remainingDuration = Math.max(0, endTime - currentTime);
            score -= remainingDuration * 25;
          }

          // Track the earliest end time for fallback
          if (endTime < earliestEndTime) {
            earliestEndTime = endTime;
          }

          // Update best voice if this one has a better score
          if (score > bestScore) {
            bestScore = score;
            voiceChosen = voice;
          }
        }

        // Fallback: If no voice chosen (shouldn't happen), take the one that ends soonest
        if (!voiceChosen) {
          voiceChosen =
            voices.find(
              (v) => v.lastTriggerTime! + (v.lastTriggerDuration || 0) === earliestEndTime,
            ) || voices[0];
        }
      }

      // Update and trigger the chosen voice
      if (voiceChosen && time) {
        const _time = (time - currentTime) * 44100;
        voiceChosen.lastTriggerTime = time;
        voiceChosen.lastTriggerDuration = dur;
        voiceChosen.trigger.click!(time);

        // Set parameters
        for (const key in validatedTrigger) {
          const _param = voiceChosen.params.find((x) => x.name === key);
          if (_param) {
            _param.param.set!(validatedTrigger[key], _time);
          }
        }
      }
    } catch (e) {
      console.log("invalid trigger received", trigger, e);
    }
  };

  const handleTrigger2 = (trigger: Message) => {
    try {
      const validatedTrigger: TriggerMessage = parse(triggerSchema, trigger);

      if (typeof trigger === "string") {
        if (voices[0]) {
          voices[0].trigger.click!();
        }
      }

      let dur = validatedTrigger.duration;
      let time = validatedTrigger.time;

      let voiceChosen: Voice | undefined;

      let i = 0;
      for (let voice of voices) {
        if (voice.lastTriggerTime === undefined) {
          voiceChosen = voice;
          break;
        } else if (voice.lastTriggerTime && voice.lastTriggerDuration) {
          let freeTime = voice.lastTriggerTime + voice.lastTriggerDuration;
          if (time > freeTime) {
            voiceChosen = voice;
            break;
          }
        }
        i++;
      }
      if (!voiceChosen) {
        let minTime = 10000000;
        i = 0;
        for (const v of voices) {
          if (v.lastTriggerTime && v.lastTriggerTime < minTime) {
            minTime = v.lastTriggerTime as number;
            voiceChosen = v;
            break;
          }
        }
      }

      if (voiceChosen && time) {
        const currentTime = node.patch.audioContext?.currentTime as number;
        let _time = (time - currentTime) * 44100;
        voiceChosen.lastTriggerDuration = dur;
        voiceChosen.lastTriggerTime = time;

        voiceChosen.trigger.click!(time);

        for (let key in validatedTrigger) {
          let _param = voiceChosen.params.find((x) => x.name === key);
          if (_param) {
            _param.param.set!(validatedTrigger[key], _time);
          }
        }
      }
    } catch (e) {
      console.log("invalid trigger received", trigger, e);
    }

    // look thru the voices
  };

  let voices: Voice[] = [];

  // voices are setup where the first argument is a "trigger" and the remaing arguments
  const initVoice = (...paramNames: string[]): Voice => {
    let params: VoiceParam[] = [];
    for (let name of paramNames) {
      params.push({
        name,
        param: param(0),
      });
    }
    let trigger: Clicker = click();
    return {
      trigger,
      params,
    };
  };

  return (trigger: Message) => {
    if (trigger !== "bang") {
      handleTrigger(trigger);
      return [];
    }

    let bodies = getDefunBodies(node);
    if (!bodies || bodies.length === 0) {
      return [];
    }

    let numBodies = bodies.length;

    // create the Voice objects
    voices.length = 0;
    let numVoices = node.attributes["voices"] as number;

    for (let voiceNumber = 0; voiceNumber < numVoices; voiceNumber++) {
      voices.push(initVoice(...args.map((arg) => arg() as string)));
    }

    // now given these voice objects we want to just generate a bunch of "calls"
    let mode = node.attributes["mode"];
    let outputs =
      mode !== "pipe" ? new Array(numBodies).fill(0) : new Array(numBodies * numVoices).fill(0);

    console.log("numBodies=%s numVoices=%s", numBodies, numVoices, outputs, bodies);

    if (outputs.length < node.outlets.length) {
      node.outlets = node.outlets.slice(0, outputs.length);
    }

    for (let invocation = 0; invocation < numVoices; invocation++) {
      let voice: Voice = voices[invocation];
      let paramArgs: Statement[] = voice.params
        .map((x) => x.param)
        .map((param, i) => {
          let obj = [
            {
              name: "param",
              param,
              value: Math.random(),
            },
          ];
          (obj as Statement).node = {
            ...node,
            id: node.id + "_invocation_" + invocation + "_param_" + i,
          };
          return obj as Statement;
        });

      let trig: Statement = [{ name: "click", param: voice.trigger }];
      trig.node = {
        ...node,
        id: node.id + "_" + invocation + "_click",
      };

      // create the call args
      let callStatement = [{ name: "call", value: invocation }, bodies, trig, ...paramArgs];

      (callStatement as Statement).node = {
        ...node,
        id: node.id + "_" + invocation,
      };

      let rets: Statement[] = [];
      for (let i = 0; i < numBodies; i++) {
        let nth: Statement = ["nth" as Operator, callStatement as Statement, i];
        let outletIndex = mode !== "pipe" ? i : invocation * numBodies + i;
        if (!node.outlets[outletIndex]) {
          node.newOutlet();
        }
        // nth.node = { ...node, id: node.id + '_' + invocation + '_nth' };
        rets.push(nth);
      }

      // now go thru the rets and add to outputs
      if (mode !== "pipe") {
        for (let i = 0; i < rets.length; i++) {
          let addition: Statement = ["add" as Operator, outputs[i], rets[i]];
          // addition.node = { ...node, id: node.id + '_addition_' + i };
          outputs[i] = addition;
          console.log("adding i=% invocation=%s", i, invocation, outputs[i]);
        }
      } else {
        // otherwise we're just piping
        for (let i = 0; i < rets.length; i++) {
          outputs[invocation * numBodies + i] = rets[i];
        }
      }
    }

    return outputs;
  };
};
