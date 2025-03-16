import { doc } from "../doc";
import { click, Clicker, ParamGen, param } from "@/lib/zen/index";
import { getDefunBodies } from "../defun-utils";
import { Message, Lazy, ObjectNode } from "../../../types";
import { object, number, optional, parse, InferOutput } from "valibot";
import { Operator, Statement } from "../types";

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
  lastKey?: string; // Added to track the voice's last key
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

// Utility to create a key from trigger message fields (excluding time and duration)
const createKey = (trigger: Record<string, any>): string => {
  const keyObj: Record<string, any> = { ...trigger };
  delete keyObj.time;
  delete keyObj.duration;
  return JSON.stringify(keyObj); // Simple string representation of the key
};

export const polytrig = (node: ObjectNode, ...args: Lazy[]) => {
  node.needsMainThread = true;
  if (!node.attributes.voices) {
    node.attributes.voices = 7; // Set to 7 per your use case
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

      if (typeof trigger === "string") {
        if (voices[0]) {
          voices[0].trigger.click!();
        }
        return;
      }

      const time = validatedTrigger.time;
      const dur = validatedTrigger.duration || 0; // Default to 0 if undefined
      const currentTime = node.patch.audioContext?.currentTime as number;
      const newKey = createKey(validatedTrigger); // Generate key for the new note
      let voiceChosen: Voice | undefined;

      // First Pass: Prefer a free voice or one with a matching key
      for (const voice of voices) {
        const isFree =
          !voice.lastTriggerTime ||
          (voice.lastTriggerTime &&
            voice.lastTriggerDuration !== undefined &&
            time > voice.lastTriggerTime + voice.lastTriggerDuration);

        if (isFree) {
          voiceChosen = voice;
          break;
        } else if (voice.lastKey === newKey) {
          // Prefer a voice with the same key, even if still playing
          voiceChosen = voice;
          break;
        }
      }

      // Second Pass: If no suitable voice found, steal the oldest voice
      if (!voiceChosen) {
        let oldestVoice = voices[0];
        let earliestTriggerTime = voices[0].lastTriggerTime || Infinity;
        for (const voice of voices) {
          if (voice.lastTriggerTime && voice.lastTriggerTime < earliestTriggerTime) {
            earliestTriggerTime = voice.lastTriggerTime;
            oldestVoice = voice;
          }
        }
        voiceChosen = oldestVoice;
      }

      // Update and trigger the chosen voice
      if (voiceChosen && time) {
        const _time = (time - currentTime) * 44100;
        voiceChosen.lastTriggerTime = time;
        voiceChosen.lastTriggerDuration = dur;
        voiceChosen.lastKey = newKey; // Store the key
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

  let voices: Voice[] = [];

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
    voices.length = 0;
    let numVoices = node.attributes["voices"] as number;

    for (let voiceNumber = 0; voiceNumber < numVoices; voiceNumber++) {
      voices.push(initVoice(...args.map((arg) => arg() as string)));
    }

    let mode = node.attributes["mode"];
    let outputs =
      mode !== "pipe" ? new Array(numBodies).fill(0) : new Array(numBodies * numVoices).fill(0);

    if (outputs.length < node.outlets.length) {
      node.outlets = node.outlets.slice(0, outputs.length);
    }

    for (let invocation = 0; invocation < numVoices; invocation++) {
      let voice: Voice = voices[invocation];
      console.log("voice=", voice);
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

      console.log("param args=", paramArgs);

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
        rets.push(nth);
      }

      if (mode !== "pipe") {
        for (let i = 0; i < rets.length; i++) {
          let addition: Statement = ["add" as Operator, outputs[i], rets[i]];
          outputs[i] = addition;
        }
      } else {
        for (let i = 0; i < rets.length; i++) {
          outputs[invocation * numBodies + i] = rets[i];
        }
      }
    }

    return outputs;
  };
};
