import { doc } from "./doc";
import { Operator, Statement, CompoundOperator } from "./types";
import { Lazy, ObjectNode, Message } from "../../types";
import { memoZen, memo } from "./memo";
import { ParamGen, param } from "@/lib/zen/index";

doc("phasor", {
  description: "generates a sawtooth signal from 0-1 at specified rate (in hz)",
  numberOfInlets: 2,
  numberOfOutlets: 1,
  defaultValue: 0,
});
const phasor = (_node: ObjectNode, ...args: Lazy[]) => {
  return (message: Message) => {
    let statement: Statement = [
      { name: "phasor" } as Operator,
      message as Statement,
      args[0]() as Statement,
    ];
    statement.node = _node;
    return [statement];
  };
};

doc("elapsed", {
  description: "returns number of samples elapsed so far",
  numberOfInlets: 0,
  numberOfOutlets: 1,
  defaultValue: 0,
});
const elapsed = (_node: ObjectNode) => {
  return (message: Message) => {
    let statement: Statement = ["elapsed" as Operator];
    statement.node = _node;
    return [statement];
  };
};

doc("param", {
  description: "sets a parameter",
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["parameter value"],
});

export const zen_param = (object: ObjectNode, name: Lazy) => {
  // object.needsLoad = true;
  if (object.attributes["default"] === undefined) {
    object.attributes["default"] = 0;
  }

  if (object.attributes["tag"] === undefined) {
    object.attributes["tag"] = "";
  }

  let _param: ParamGen;
  return (x: Message): Statement[] => {
    if (typeof x === "number") {
      object.storedMessage = x;
    }

    if (_param === undefined) {
      let defaultValue = object.attributes["default"] as number;
      const { min, max } = object.attributes;
      if (object.storedMessage !== undefined) {
        _param = param(
          object.storedMessage as number,
          name() as string,
          min as number,
          max as number,
        );
        object.storedParameterValue = object.storedMessage as number;
      } else {
        _param = param(defaultValue, name() as string, min as number, max as number);
        object.storedParameterValue = defaultValue;
      }
    }
    if (typeof x === "string" && x !== "bang") {
      const tokens = x.split(" ");
      if (tokens.length === 2) {
        x = parseFloat(tokens[1]);
      } else if (tokens.length === 3 && tokens[0] === name()) {
        x = [parseFloat(tokens[1]), parseFloat(tokens[2])];
      }
    }
    if (typeof x === "string" && x !== "bang" && x.split(" ").length === 2) {
      let split = x.split(" ");
      x = parseFloat(split[1]);
    }
    let isScheduleSet = Array.isArray(x) && typeof x[0] === "number";
    if (typeof x === "number" || isScheduleSet) {
      if (Array.isArray(x)) {
        object.storedMessage = x[0] as number;
        let time = x[1] as number;
        time = (time - object.patch.audioContext.currentTime) * 44100;
        _param.set!(x[0] as number, time);
        object.storedParameterValue = x[0] as number;
      } else {
        object.storedMessage = x as number;
        _param.set!(x as number);
        object.storedParameterValue = x as number;
      }

      return [];
    }

    let out: Statement = [
      {
        name: "param",
        param: _param,
        value: Math.random(),
      },
    ];
    if (name() === "wet") {
    }
    out.node = object;
    object.patch.newHistoryDependency(out, object);
    return [out];
  };
};

doc("cycle", {
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["frequency", "phase"],
  description: "sine wave oscillator",
  defaultValue: 0,
});

export const zen_cycle = (object: ObjectNode, phase: Lazy) => {
  return memoZen(object, "cycle" as Operator, phase);
};

doc("accum", {
  inletNames: ["incrementer", "reset", "min", "max"],
  numberOfInlets: 4,
  numberOfOutlets: 1,
  description: "accumulates incrementer between min and max, conditionally resetting",
});

export const zen_accum = (object: ObjectNode, reset: Lazy, min: Lazy, max: Lazy) => {
  return memo(
    object,
    (x: Message): Statement => {
      let params = { min: min(), max: max() };
      let operator = {
        name: "accum",
        params,
      };
      return [operator as CompoundOperator, x as Statement, reset() as Statement];
    },
    reset,
    min,
    max,
  );
};

doc("triangle", {
  inletNames: ["ramp", "duty"],
  numberOfInlets: 2,
  numberOfOutlets: 1,
  description: "turns unipolar ramp into triangle wave, with control over duty cycle",
  defaultValue: 0.5,
});

export const zen_triangle = (object: ObjectNode, duty: Lazy) => {
  return memoZen(object, "triangle" as Operator, duty);
};

doc("sine", {
  inletNames: ["input"],
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "calculates sine function on input",
});

export const zen_sine = (object: ObjectNode) => {
  return memoZen(object, "sine" as Operator);
};

doc("rampToTrig", {
  inletNames: ["ramp"],
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "turns ramps into triggers",
});
export const zen_rampToTrig = (object: ObjectNode) => {
  return memoZen(object, "rampToTrig" as Operator);
};

doc("noise", {
  numberOfInlets: 0,
  numberOfOutlets: 1,
  description: "generates a random signal from 0-1",
});
export const zen_noise = (object: ObjectNode) => {
  return memoZen(object, "noise" as Operator);
};

doc("selector", {
  inletNames: ["select", "arg"],
  numberOfInlets: (x: number) => x,
  numberOfOutlets: 1,
  description: "selector",
});
export const selector = (object: ObjectNode, ...args: Lazy[]) => {
  return memoZen(object, "selector" as Operator, ...args);
};

doc("compressor", {
  inletNames: [
    "input",
    "ratio",
    "threshold",
    "knee",
    "attack",
    "release",
    "sidechain mode",
    "sidechain input",
  ],
  numberOfInlets: 8,
  numberOfOutlets: 1,
  description: "simple compressor, with sidechain compression",
  defaultValue: 0,
  //saturation: '',
  //makeup_gain: '',
  //attack_mode: '',
});

export const compressor = (
  object: ObjectNode,
  ratio: Lazy,
  threshold: Lazy,
  knee: Lazy,
  attack: Lazy,
  release: Lazy,
  sidechainMode: Lazy,
  sidechainInput: Lazy,
) => {
  return memoZen(
    object,
    "compressor" as Operator,
    ratio,
    threshold,
    knee,
    attack,
    release,
    sidechainMode,
    sidechainInput,
  );
};

export const core = {
  compressor,
  selector,
  cycle: zen_cycle,
  triangle: zen_triangle,
  noise: zen_noise,
  rampToTrig: zen_rampToTrig,
  sine: zen_sine,
  accum: zen_accum,
  param: zen_param,
  phasor,
  elapsed,
};
