import { UGen, Arg, Generated } from "./zen";
import { Target } from "./targets";
import { simdMemo } from "./memo";
import { zswitch } from "./switch";
import { uuid } from "./uuid";
import { Context } from "./context";
import { zen_let } from "./let";
import { simdOp, simdFunc } from "./simdMath";

export const op = (
  operator: string,
  name: string,
  evaluator?: (x: number, y: number) => number,
  first?: number,
) => {
  return (...ins: Arg[]): UGen => {
    let id = uuid();
    return simdMemo(
      (context: Context, ..._ins: Generated[]): Generated => {
        const [opVar] = context.useCachedVariables(id, name + "Val");
        let code = `${context.varKeyword} ${opVar} = ${_ins.map((x) => x.variable).join(" " + operator + " ")};`;
        if (operator === "%") {
          if (context.target === Target.C) {
            code = `${context.varKeyword} ${opVar} = fmod(${_ins[0].variable}, ${_ins[1].variable});`;
          }
        }
        if (operator === "^") {
          if (context.target === Target.C) {
            code = `${context.varKeyword} ${opVar} = ((int)${_ins[0].variable})^((int) ${_ins[1].variable});`;
          }
        }
        if (operator === "/") {
          // we need to be save
          code = `${context.varKeyword} ${opVar} = ${_ins[1].variable} == 0.0 ? 0.0 : ${_ins.map((x) => x.variable).join(" " + operator + " ")};`;
        }

        // see if we are just dealing with constants or evaluated constants (if so we simply add it directly here to
        // avoid needless computation)
        if (
          _ins.every((x, i) => typeof ins[i] === "number" || x.scalar !== undefined) &&
          evaluator
        ) {
          let total =
            first === undefined
              ? _ins
                  .map((x, i) => (typeof ins[i] === "number" ? ins[i] : x.scalar))
                  .map((x) => x as number)
                  .reduce(evaluator)
              : _ins
                  .map((x, i) => (typeof ins[i] === "number" ? ins[i] : x.scalar))
                  .map((x) => x as number)
                  .reduce(evaluator, first);

          code = `${context.varKeyword} ${opVar} = ${total};`;
          let gen = context.emit(code, opVar);
          let codeFrag = gen.codeFragments[0];
          codeFrag.dependencies = [];
          return {
            ...gen,
            codeFragments: [codeFrag],
            scalar: total,
          };
        }
        if (ins.every((x) => typeof x === "number") && evaluator !== undefined) {
          let total =
            first === undefined
              ? ins.map((x) => x as number).reduce(evaluator)
              : ins.map((x) => x as number).reduce(evaluator, first);

          code = `${context.varKeyword} ${opVar} = ${total};`;
          return {
            ...context.emit(code, opVar),
            scalar: total,
          };
        }
        let x = context.emit(code, opVar, ..._ins);
        return x;
      },
      undefined,
      ...ins,
    );
  };
};

type Keywords = {
  [x: string]: string;
};

export const cKeywords: Keywords = {
  "Math.abs": "fabs",
  "Math.random": "random_double",
  "Math.floor": "floor",
  "Math.trunc": "trunc",
  "Math.round": "round",
  "Math.ceil": "ceil",
  "Math.sin": "sin",
  "Math.tan": "tan",
  "Math.cos": "cos",
  "Math.tanh": "tanh",
  "Math.log2": "(1.0f / log(2)) * log", // C does not have a direct log2 function
  "Math.log10": "log10",
  "Math.pow": "pow",
  "Math.atan": "atan",
  "Math.exp": "exp",
  "Math.sqrt": "sqrt",
  // C does not have minf and maxf, but you can create your own functions for that
  "Math.min": "fmin",
  "Math.max": "fmax",
};

export const func = (func: string, name: string, jsFunc?: (...x: number[]) => number) => {
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
      undefined,
      ...ins,
    );
  };
};

export const isComparisonOperator = (op: string) => ["<", ">", ">=", "<=", "==", "!="].includes(op);

export const add = simdOp("+", "add", (a, b) => a + b, 0);
export const shiftLeft = simdOp("<<", "shiftLeft", (a, b) => a << b, 0);
export const shiftRight = simdOp(">>", "shiftRight", (a, b) => a >> b, 0);
export const sub = simdOp("-", "sub", (a, b) => a - b);
export const xor = op("^", "xor", (a, b) => a ^ b);
export const mult = simdOp("*", "mult", (a, b) => a * b, 1);
export const div = simdOp("/", "div", (a, b) => a / b);
export const lt = simdOp("<", "lt");
export const lte = simdOp("<=", "lte");
export const gt = simdOp(">", "gt");
export const gte = simdOp(">=", "gte");
export const and = simdOp("&&", "and");
export const or = simdOp("||", "or", (a, b) => a || b);
export const eq = simdOp("==", "eq");
export const neq = simdOp("!=", "neq");
export const mod = simdOp("%", "mod", (a, b) => a % b);
export const abs = simdFunc("Math.abs", "abs", Math.abs);
export const floor = simdFunc("Math.floor", "floor", Math.floor);
export const ceil = simdFunc("Math.ceil", "ceil", Math.ceil);
export const sin = func("Math.sin", "sin", Math.sin);
export const tan = func("Math.tan", "tan", Math.tan);
export const cos = func("Math.cos", "cos", Math.cos);
export const tanh = func("Math.tanh", "tanh", Math.tanh);
export const log = func("Math.log", "log", Math.log);
export const log2 = func("Math.log2", "log2", Math.log2);
export const log10 = func("Math.log10", "log10", Math.log10);
export const pow = func("Math.pow", "pow", Math.pow);
export const atan = func("Math.atan", "atan", Math.atan);
export const exp = func("Math.exp", "exp", Math.exp);
export const sqrt = simdFunc("Math.sqrt", "sqrt", Math.sqrt);
export const min = simdFunc("Math.min", "min", Math.min);
export const max = simdFunc("Math.max", "max", Math.max);

export const sign = (val: Arg): UGen => {
  return zen_let("sign", sub(lt(0, val), lt(val, 0)));
};

export const mix = (a: Arg, b: Arg, amount: Arg): UGen => {
  return add(mult(b, amount), mult(a, sub(1, amount)));
};

export const wrap = (input: Arg, min: Arg, max: Arg): UGen => {
  let range = sub(max, min);
  let normalized = mod(sub(input, min), range);
  //return add(normalized, min);
  return zswitch(gte(normalized, 0), add(normalized, min), add(range, add(normalized, min)));
};

export const _wrap = (input: Arg, min: Arg, max: Arg): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _input: Generated, _min: Generated, _max: Generated): Generated => {
      let diff = `(${_max.variable} - ${_min.variable})`;
      let [wrapName, range, normalized] = context.useCachedVariables(
        id,
        "wrapVal",
        "diffVal",
        "normalized",
      );

      const _mod = (x: string, y: string) =>
        context.target === Target.C ? `fmod(${x}, ${y})` : `((${x})%(${y}))`;
      let code = `
${context.varKeyword} ${range} = ${diff};
${context.varKeyword} ${normalized} = ${_mod(_input.variable + " - " + _min.variable, range)};
${context.varKeyword} ${wrapName} = ${normalized} >= 0 ? ${normalized} + ${_min.variable} : ${range} + ${normalized} + ${_min.variable};
`;

      return context.emit(code, wrapName, _input, _min, _max);
    },
    undefined,
    input,
    min,
    max,
  );
};

export const clamp = (input: Arg, _min: Arg, _max: Arg): UGen => {
  return max(_min, min(input, _max));
};

export const _clamp = (input: Arg, min: Arg, max: Arg): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _input: Generated, _min: Generated, _max: Generated): Generated => {
      let [clampName] = context.useCachedVariables(id, "clampVal");

      let code = `
${context.varKeyword} ${clampName} = ${_input.variable};
if( ${clampName} < ${_min.variable}) ${clampName} = ${_min.variable};
else if(${clampName} > ${_max.variable}) ${clampName} = ${_max.variable};`;

      return context.emit(code, clampName, _input, _min, _max);
    },
    undefined,
    input,
    min,
    max,
  );
};

export const reciprical = (input: Arg): UGen => div(1, input);

export const not_sub = (input: Arg, sec?: Arg): UGen => {
  return sub(sec || 1, input);
};

export const _not_sub = (input: Arg, sec?: Arg): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _input: Generated, _sec: Generated): Generated => {
      let [notSub] = context.useCachedVariables(id, "notSubValue");

      let code = `${context.varKeyword} ${notSub} = ${_sec.variable} - ${_input.variable};`;
      return context.emit(code, notSub, _input, _sec);
    },
    undefined,
    input,
    sec!,
  );
};

export type RoundMode = "ceil" | "trunc" | "floor" | "nearest";

const trunc = simdFunc("Math.trunc", "trunc", Math.trunc);

export const round = (numb: Arg, multi: Arg, mode: RoundMode): UGen => {
  console.log("mode=", mode);
  let numbRound = div(numb, multi);
  const preMultiply =
    mode === "ceil"
      ? ceil(numbRound)
      : mode === "trunc"
        ? trunc(numbRound)
        : mode === "floor"
          ? floor(numbRound)
          : simdFunc("Math.round", "round", Math.round)(numbRound);

  return mult(multi, preMultiply);
};

export const _round = (numb: Arg, multi: Arg, mode: RoundMode): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, num: Generated, multiple: Generated) => {
      let [roundVal, div] = context.useCachedVariables(id, "roundVal", "div");

      let out = `
${context.varKeyword} ${div} = ${num.variable} / ${multiple.variable};
`;
      let rounder = "";
      switch (mode) {
        case "ceil":
          rounder = context.target === Target.C ? cKeywords["Math.ceil"] : "Math.ceil";
          break;
        case "trunc":
          rounder = context.target === Target.C ? cKeywords["Math.trunc"] : "Math.trunc";
          break;
        case "floor":
          rounder = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
          break;
        case "nearest":
          rounder = context.target === Target.C ? cKeywords["Math.round"] : "Math.round";
      }

      out += `
${context.varKeyword} ${roundVal} = ${multiple.variable} * ${rounder} (${div});
    `;

      return context.emit(out, roundVal, num, multiple);
    },
    undefined,
    numb,
    multi,
  );
};

export const exp2 = (num: Arg) => pow(2, num);
