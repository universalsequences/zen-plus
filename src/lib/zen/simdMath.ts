import type { SIMDContext, Context } from "./context";
import type { UGen, Generated, Arg } from "./zen";
import { genInputs } from "./worklet";
import { CodeFragment } from "./emitter";
import { simdMemo, type SIMDOutput } from "./memo";
import { cKeywords, isComparisonOperator } from "./math";
import { Target } from "./targets";
import { SIMD_OPERATIONS, SIMD_FUNCTIONS } from "./simd";
import { uuid } from "./uuid";

const generateScalar = (context: Context, scalar: number, opVar: string) => {
  const code = `${context.varKeyword} ${opVar} = ${scalar};`;
  const gen = context.emit(code, opVar);
  const codeFrag = gen.codeFragments[0];

  // a scalar has no dependencies
  codeFrag.dependencies = [];
  return {
    ...gen,
    codeFragments: [codeFrag],
    scalar: scalar,
  };
};

export const simdOp = (
  operator: string,
  name: string,
  evaluator?: (x: number, y: number) => number,
  first?: number,
) => {
  return (...ins: Arg[]): UGen => {
    const id = uuid();
    return simdMemo(
      (context: Context, ...evaluatedArgs: Generated[]): Generated => {
        const [opVar] = context.useCachedVariables(id, `${name}Val`);
        if (evaluatedArgs.every((x) => x.scalar !== undefined) && evaluator) {
          // every argument is a number (scalar) so we just evaluate it directly
          const numbers = evaluatedArgs.map((x) => x.scalar) as number[];
          const total =
            first === undefined
              ? numbers.reduce(evaluator)
              : numbers.map((x) => x as number).reduce(evaluator, first);
          return generateScalar(context, total, opVar);
        }

        // otherwise we need to generate code to evaluate the op
        let code = `${context.varKeyword} ${opVar} = ${evaluatedArgs.map((x) => x.variable).join(` ${operator} `)};`;
        if (operator === "%") {
          if (context.target === Target.C) {
            code = `${context.varKeyword} ${opVar} = fmod(${evaluatedArgs[0].variable}, ${evaluatedArgs[1].variable});`;
          }
        }
        if (operator === "^") {
          if (context.target === Target.C) {
            code = `${context.varKeyword} ${opVar} = ((int)${evaluatedArgs[0].variable})^((int) ${evaluatedArgs[1].variable});`;
          }
        }
        if (operator === "/") {
          // we need to be save
          code = `${context.varKeyword} ${opVar} = ${evaluatedArgs[1].variable} == 0.0 ? 0.0 : ${evaluatedArgs.map((x) => x.variable).join(" " + operator + " ")};`;
        }

        return context.emit(code, opVar, ...evaluatedArgs);
      },

      // the SIMD function for math ops:
      (context: SIMDContext, ...evaluatedArgs: Generated[]): SIMDOutput => {
        // if every element is a scalar or the operation is not supported, then we need to fall back on
        // scalar
        if (
          evaluatedArgs.every((x) => x.scalar !== undefined) ||
          !SIMD_OPERATIONS[operator]
        ) {
          return {
            type: "SIMD_NOT_SUPPORTED",
          };
        }

        const [opVar] = context.useCachedVariables(id, `${name}Val`);

        // otherwise we attempt to do this as SIMD
        const inVariables = evaluatedArgs.map((x) => x.variable);
        // otherwise, we're in SIMD land
        let i = 0;
        let code = "";
        for (const input of evaluatedArgs) {
          if (input.scalar !== undefined) {
            // we need to create a constant SIMD vector (via splatting)
            const [v] = context.useCachedVariables(
              id + i * 78932,
              "constantVector",
            );
            code += `v128_t ${v}= wasm_f32x4_splat(${input.scalar});
`;
            inVariables[i] = v;
          } else if (input.codeFragments[0].context.isSIMD) {
            if (input.codeFragments[0].context !== context) {
              // the dependency exists in a previous block so we simply need to note that
              // we need this dependency (i.e. pass the needed variable to context.emitSIMD)
              const variable = input.variable;
              inVariables[i] = variable;
            } else {
              inVariables[i] = input.variable;
            }
          } else if (!input.codeFragments[0].context.isSIMD) {
          }
          i++;
        }

        if (isComparisonOperator(operator)) {
          // comparisons in SIMD need a few extra steps to convert them to usable values (1/0)
          // TODO - move to helper function
          const [bitmask, trueVec, falseVec] = context.useCachedVariables(
            id,
            "bitmask",
            "trueVec",
            "falseVec",
          );
          code += `
v128_t ${bitmask} = ${SIMD_OPERATIONS[operator]}(${inVariables[0]}, ${inVariables[1]});
v128_t ${trueVec} = wasm_f32x4_splat(1.0f);
v128_t ${falseVec} = wasm_f32x4_splat(0.0f);
v128_t ${opVar} = wasm_v128_bitselect(${trueVec}, ${falseVec}, ${bitmask});
`;
        } else {
          // straight SIMD
          code += `v128_t ${opVar} = ${SIMD_OPERATIONS[operator]}(${inVariables[0]}, ${inVariables[1]});
`;
        }

        // emit SIMD based on the ins
        // if all the ins are also SIMD then we will have them all share the same SIMD block
        const generated: Generated = context.emitSIMD(
          code,
          opVar,
          ...evaluatedArgs,
        );
        return {
          generated,
          type: "SUCCESS",
        };
      },
      ...ins,
    );
  };
};

export const simdFunc = (
  func: string,
  name: string,
  jsFunc?: (...x: number[]) => number,
) => {
  return (...ins: Arg[]): UGen => {
    let id = uuid();
    return simdMemo(
      (context: Context, ..._ins: Generated[]): Generated => {
        let [opVar] = context.useCachedVariables(id, `${name}Val`);
        let _func = context.target === Target.C ? cKeywords[func] : func;

        let scalar =
          ins.length > 0 && ins.every((x) => typeof x === "number")
            ? jsFunc!(...(ins as number[]))
            : undefined;
        let code =
          ins.length > 0 && ins.every((x) => typeof x === "number")
            ? `${context.varKeyword} ${opVar} = ${jsFunc!(...(ins as number[]))};`
            : `${context.varKeyword} ${opVar} = ${_func}(${_ins.map((x) => x.variable).join(",")});`;
        let y = context.emit(code, opVar, ..._ins);
        y.scalar = scalar;
        return y;
      },

      // the SIMD function for math ops:
      (context: SIMDContext, ...evaluatedArgs: Generated[]): SIMDOutput => {
        // if every element is a scalar or the operation is not supported, then we need to fall back on
        // scalar
        if (
          (jsFunc && evaluatedArgs.every((x) => x.scalar !== undefined)) ||
          !SIMD_FUNCTIONS[name]
        ) {
          return {
            type: "SIMD_NOT_SUPPORTED",
          };
        }

        let [opVar] = context.useCachedVariables(id, name + "Val");

        // otherwise we attempt to do this as SIMD
        let inVariables = evaluatedArgs.map((x) => x.variable);
        // otherwise, we're in SIMD land
        let i = 0;
        let code = "";
        for (let input of evaluatedArgs) {
          if (input.scalar !== undefined) {
            // we need to create a constant SIMD vector (via splatting)
            let [v] = context.useCachedVariables(id, "constantVector");
            code += `v128_t ${v}= wasm_f32x4_splat(${input.scalar});
`;
            inVariables[i] = v;
          } else if (input.codeFragments[0].context.isSIMD) {
            if (input.codeFragments[0].context !== context) {
              // the dependency exists in a previous block so we simply need to note that
              // we need this dependency (i.e. pass the needed variable to context.emitSIMD)
              let variable = input.variable;
              inVariables[i] = variable;
            } else {
              inVariables[i] = input.variable;
            }
          } else if (!input.codeFragments[0].context.isSIMD) {
          }
          i++;
        }

        // straight SIMD
        code += `v128_t ${opVar} = ${SIMD_FUNCTIONS[name]}(${inVariables.join(",")});
`;
        // emit SIMD based on the ins
        // if all the ins are also SIMD then we will have them all share the same SIMD block
        let generated: Generated = context.emitSIMD(
          code,
          opVar,
          ...evaluatedArgs,
        );
        return {
          generated,
          type: "SUCCESS",
        };
      },
      ...ins,
    );
  };
};
