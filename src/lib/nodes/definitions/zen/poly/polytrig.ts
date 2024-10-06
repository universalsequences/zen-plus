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

      if (typeof trigger === "string") {
        if (voices[0]) {
          voices[0].trigger.click!();
        }
      }

      let dur = validatedTrigger.duration;
      let time = validatedTrigger.time;

      let voiceChosen: Voice | undefined;

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
      }
      if (!voiceChosen) {
        let minTime = 10000000;
        for (const v of voices) {
          if (v.lastTriggerTime && v.lastTriggerTime < minTime) {
            minTime = v.lastTriggerTime as number;
            voiceChosen = v;
          }
        }
      }

      if (voiceChosen && time) {
        let _time = (time - node.patch.audioContext.currentTime) * 44100;
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
      console.log("invalid trigger received", trigger);
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

    let numBodies = bodies.filter((x) => (x as CompoundOperator).name === "defun").length;

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
