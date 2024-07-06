import { Arg, UGen, Generated } from "./zen";
import { simdMemo, memo } from "./memo";
import { Target } from "./targets";
import { Context } from "./context";
import { history } from "./history";
import { mix, sub } from "./math";
import { uuid } from "./uuid";

export const sampstoms = (input: Arg) => {
  let id = uuid();
  return simdMemo(
    (context: Context, _input: Generated) => {
      // samples to ms 44100 - > 1000
      let [ms] = context.useCachedVariables(id, "ms");
      let code = `${context.varKeyword} ${ms} = 1000.0*${_input.variable}/${context.sampleRate};`;

      return context.emit(code, ms, _input);
    },
    undefined,
    input,
  );
};

export const mstosamps = (input: Arg) => {
  let id = uuid();
  return simdMemo(
    (context: Context, _input: Generated) => {
      // ms to samps 1000 -> 44100
      let [samps] = context.useCachedVariables(id, "samps");
      let code = `${context.varKeyword} ${samps} = (${_input.variable}/1000)*${context.sampleRate};`;

      let ret = context.emit(code, samps, _input);
      return ret;
    },
    undefined,
    input,
  );
};

export const dcblock = (input: Arg) => {
  const hist = history();
  return sub(input, hist(mix(input, hist(), 0.999)));
};

export const elapsed = () => {
  return simdMemo((context: Context) => {
    // ms to samps 1000 -> 44100
    const [elapsed] = context.useVariables("elapsed");
    const pre = context.target === Target.C ? "" : "this.";
    const code = `${context.varKeyword} ${elapsed} = ${pre}elapsed + j;`;
    return context.emit(code, elapsed);
  });
};

export const fixnan = (input: Arg) => {
  return simdMemo((context: Context) => {
    // ms to samps 1000 -> 44100
    const _input = context.gen(input);
    const [fixed] = context.useVariables("fixed");
    const op = context.target === Target.C ? "isnan" : "isNaN";
    const code = `${context.varKeyword} ${fixed} = ${op}(${_input.variable}) ? 0.0 : ${_input.variable};`;
    return context.emit(code, fixed, _input);
  });
};
