import { SIMDContext, Context } from "./context";
import { uuid } from "./uuid";
import { simdMemo } from "./memo-simd";
import { printCodeFragments, CodeFragment } from "./emitter";
import { Argument, Function } from "./functions";
import { Target } from "./targets";
import { CodeBlock } from "./simd";
import { History } from "./history";
import { determineBlocks } from "./blocks/analyze";

/**
 * Zen is a minimal implementation of a few simple gen~ (max/msp)
 * operators
 * The goal is that by writing this simple library, and putting it
 *  onchain, so complex musical onchain NFTs can be made.
 *
 */

export interface Generated {
  totalOutputs?: number;
  code?: string;
  codeFragments: CodeFragment[];
  outerCode?: string;
  variable?: string /* the variable name referenced */;
  histories: string[];
  outputHistories: string[];
  variables?: string[];
  outerHistories?: string[];
  outputs?: number;
  inputs?: number;
  params: History[];
  context?: Context;
  isLoopDependent?: boolean;
  outerLoops?: string[];
  functions: Function[];
  functionArguments: Argument[];
  codeBlocks?: CodeBlock[];
  scalar?: number;
  clearMemoization?: () => void;
  usingForceScalarFunction?: boolean;
  incomingContext?: Context;
  inbound?: string[];
}

export type UGen = (context: Context) => Generated;

export type ZenGraph = Generated & {
  context: Context;
  histories: string[];
  numberOfInputs: number;
  numberOfOutputs: number;
};

export type Arg = UGen | number;

export const float = (x: number): UGen => {
  let floated = x.toString();
  if (x - Math.floor(x) === 0) {
    floated += ".0";
  }
  return () => {
    return {
      code: floated,
      codeFragments: [],
      codeBlocks: [],
      scalar: x,
      variable: floated,
      variables: [],
      functions: [],
      functionArguments: [],
      histories: [],
      params: [],
      outputHistories: [],
    };
  };
};

export const input = (inputNumber = 0): UGen => {
  const id = uuid();
  return simdMemo(
    (context: Context) => {
      const [variable] = context.useCachedVariables(id, `${context.input(inputNumber)}_var`);
      if (context.target === Target.Javascript) {
        const code = `
let ${variable}_index = inputs[0];
let ${variable} = ${variable}_index && ${variable}_index[${inputNumber}] ? ${variable}_index[${inputNumber}][j] : 0;
`;
        return context.emit(code, variable);
      }
      const indexer =
        context.target === Target.C ? `[128*${inputNumber} + j]` : `[0][${inputNumber}][j]`;
      const code = `
${context.varKeyword} ${variable} = inputs${indexer};`;
      return context.emit(code, variable);
    },
    /*
    (context: SIMDContext) => {
      const [variable] = context.useCachedVariables(id, "input_var");
      const code = `v128_t ${variable} = wasm_v128_load(&inputs[128*${inputNumber} + j]);`;
      return {
        type: "SUCCESS",
        generated: context.emitSIMD(code, variable),
      };
    },
    */
  );
};

export const zen = (input: UGen): ZenGraph => {
  return zenWithTarget(Target.C, input, false);
};

export const zenJavascript = (input: UGen): ZenGraph => {
  return zenWithTarget(Target.Javascript, input);
};

export const zenC = (input: UGen): ZenGraph => {
  return zenWithTarget(Target.C, input);
};

// The way this works w/o outputs: each output will go in a different argument
export const zenWithTarget = (target: Target, input: UGen, forceScalar = false): ZenGraph => {
  const context: Context = new Context(target);
  context.forceScalar = forceScalar;
  const generated: Generated = input(context);
  console.log("context numberOfInputs=", context.numberOfInputs);
  return {
    ...generated,
    context,
    histories: [],
    numberOfInputs: context.numberOfInputs,
    numberOfOutputs: countOutputs(generated.codeFragments),
  };
};

export const countOutputs = (codeFragments: CodeFragment[]): number => {
  const blocks = determineBlocks(...codeFragments);
  const allOutputs = blocks.flatMap((b) => b.outputs);
  return new Set(allOutputs).size;
};

export const genArg = (input: Arg, context: Context): Generated => {
  if (typeof input === "number") {
    return float(input)(context);
  }
  return input(context);
};
