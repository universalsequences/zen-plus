import { type RegisteredPatch, registry } from "../nodes/definitions/core/registry";
import * as Core from "../nodes/types";
import { read, publish } from "@/lib/messaging/queue";
import type { ListPool } from "./ListPool";
import { isSymbol } from "./types";
import type {
  Expression,
  Message,
  Symbol,
  ObjectLiteral,
  Atom,
  FunctionDefinition,
  Environment,
} from "./types";
import { getRootPatch } from "../nodes/traverse";

const stringCache: { [x: string]: string } = {};

export const createContext = (pool: ListPool, objectNode: Core.ObjectNode) => {
  function evaluate(expressions: Expression[], env: Environment): Message {
    let result: Message = null;
    for (const expr of expressions) {
      result = evaluateExpression(expr, env);
    }
    return result;
  }

  function evaluateExpression(expr: Expression, env: Environment, index = 1): Message {
    const e = () => {
      if (Array.isArray(expr)) {
        return evaluateList(expr, env);
      }
      if (typeof expr === "object" && expr !== null) {
        if ("type" in expr) {
          if (expr.type === "object") {
            return evaluateObject(expr, env);
          }
          if (expr.type === "function") {
            return defineFunctionInEnv(expr, env);
          }
        }
      }
      return evaluateAtom(expr, env, index);
    };
    const r = e();
    return r;
  }

  const shapeArgs = (args: Expression[], env: Environment): Expression[] => {
    const _args: Expression[] = new Array(args.length);
    let argIndex = 0;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i] as Symbol;
      if (arg.type === "Symbol" && arg.value === "...") {
        const evaluated_arg = evaluateExpression(args[++i], env, i);
        if (Array.isArray(evaluated_arg)) {
          const len = evaluated_arg.length;
          for (let j = 0; j < len; j++) {
            _args[argIndex++] = evaluated_arg[j];
          }
        }
      } else {
        _args[argIndex++] = args[i];
      }
    }
    _args.length = argIndex;
    return _args;
  };

  const operators = {
    defun: (args: Expression[], env: Environment) => {
      if (args.length !== 3) {
        throw new Error("defun requires a name, a list of parameters, and a body");
      }
      if (!Array.isArray(args[1])) {
        throw new Error("defun requires list as first arg");
      }
      const funcName = args[0];
      const _params = args[1];
      const defunBody = args[2];
      if (!isSymbol(funcName)) {
        throw new Error("Function name must be a symbol");
      }
      return defineFunctionInEnv(
        {
          type: "function",
          params: [funcName as Symbol, ...(_params as Symbol[])],
          body: defunBody,
        },
        env,
      );
    },

    lambda: (args: Expression[], env: Environment) => {
      if (args.length !== 2 || !Array.isArray(args[0])) {
        throw new Error("Lambda expression must have parameter list and body");
      }
      const params = args[0] as Symbol[];
      if (params.some((x) => !isSymbol(x))) {
        throw new Error("Lambda expression must have parameter list of symbols");
      }
      const body = args[1];
      return (callScope: Environment) =>
        (...args: Message[]) => {
          const localEnv = { ...env, ...callScope };
          params.slice(0).forEach((param, index) => {
            localEnv[param.value] = args[index];
          });
          return evaluateExpression(body, localEnv);
        };
    },

    let: (args: Expression[], env: Environment) => {
      if (args.length < 2) {
        throw new Error("Let requires at least two arguments: bindings and body");
      }
      const bindings = args[0];
      const letBody = args.slice(1);

      if (!Array.isArray(bindings)) {
        throw new Error("First argument to let must be a list of bindings");
      }

      const localEnv = Object.create(env);
      for (let i = 0; i < bindings.length; i += 1) {
        const b = bindings[i];
        if (!Array.isArray(b)) {
          throw new Error("let variables must be lists");
        }
        const [varName, varValue] = b;
        if (!isSymbol(varName)) {
          throw new Error("Variable name in let binding must be a symbol");
        }
        localEnv[(varName as Symbol).value] = evaluateExpression(varValue, localEnv);
      }

      let result: Message = null;
      if (!letBody) {
        throw new Error("must have body for let");
      }
      for (const expr of letBody) {
        result = evaluateExpression(expr, localEnv);
      }
      return result;
    },

    fill: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("fill requires exactly two arguments: a function and a list");
      }
      const fillSize = evaluateExpression(args[0], env);
      const fillValue = evaluateExpression(args[1], env);
      return new Array(fillSize as number).fill(fillValue);
    },

    map: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("Map requires exactly two arguments: a function and a list");
      }
      const mapFunc = evaluateExpression(args[0], env);
      let mapList = evaluateExpression(args[1], env);

      if (typeof mapFunc !== "function") {
        throw new Error("First argument to map must be a function");
      }
      if (ArrayBuffer.isView(mapList)) {
        mapList = Array.from(mapList as Float32Array);
      }
      if (!Array.isArray(mapList)) {
        throw new Error("Second argument to map must be a list");
      }

      return mapList.map((item, index) => {
        if (typeof mapFunc === "function") {
          return mapFunc(env)(item, index);
        }
        throw new Error("Unexpected error: mapFunc is not a function");
      });
    },

    filter: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("Map requires exactly two arguments: a function and a list");
      }
      const mapFunc = evaluateExpression(args[0], env);
      let mapList = evaluateExpression(args[1], env);

      if (typeof mapFunc !== "function") {
        throw new Error("First argument to map must be a function");
      }
      if (ArrayBuffer.isView(mapList)) {
        mapList = Array.from(mapList as Float32Array);
      }
      if (!Array.isArray(mapList)) {
        throw new Error("Second argument to map must be a list");
      }

      return mapList.filter((item, index) => {
        if (typeof mapFunc === "function") {
          return mapFunc(env)(item, index);
        }
        throw new Error("Unexpected error: mapFunc is not a function");
      });
    },

    "+": (args: Expression[], env: Environment) => {
      return args.reduce(
        (sum, arg) => (sum as any) + evaluateExpression(arg, env),
        typeof args[0] === "string" ? "" : 0,
      );
    },

    "-": (args: Expression[], env: Environment) => {
      if (args.length === 1) {
        return -Number(evaluateExpression(args[0], env));
      }
      return Number(
        (evaluateExpression(args[0], env) as number) - (evaluateExpression(args[1], env) as number),
      );
    },

    "*": (args: Expression[], env: Environment) => {
      return args.reduce(
        (product, arg) => (product as number) * Number(evaluateExpression(arg, env)),
        1,
      );
    },

    "/": (args: Expression[], env: Environment) => {
      return Number(
        (evaluateExpression(args[0], env) as number) / (evaluateExpression(args[1], env) as number),
      );
    },

    dot: (args: Expression[], env: Environment) => {
      const a = evaluateExpression(args[0], env) as number[];
      const b = evaluateExpression(args[1], env) as number[];
      let sum = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        sum += a[i] * b[i];
      }
      return sum;
    },

    stride: (args: Expression[], env: Environment) => {
      const arr = evaluateExpression(args[0], env) as number[];
      const l = evaluateExpression(args[1], env) as number;
      const off = evaluateExpression(args[2], env) as number;
      const result = [];
      for (let i = off; i < arr.length; i += l) {
        if (arr[i] === undefined) break;
        result.push(arr[i]);
      }
      return result;
    },

    cross: (args: Expression[], env: Environment) => {
      const a = evaluateExpression(args[0], env) as number[];
      const b = evaluateExpression(args[1], env) as number[];
      const len = Math.min(a.length, b.length);
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = a[i] * b[i];
      }
      return result;
    },

    cross_sub: (args: Expression[], env: Environment) => {
      const a = evaluateExpression(args[0], env) as number[];
      const b = evaluateExpression(args[1], env) as number[];
      const len = Math.min(a.length, b.length);
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = a[i] - b[i];
      }
      return result;
    },

    cross_add: (args: Expression[], env: Environment) => {
      const a = evaluateExpression(args[0], env) as number[];
      const b = evaluateExpression(args[1], env) as number[];
      const len = Math.min(a.length, b.length);
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = a[i] + b[i];
      }
      return result;
    },

    exp2: (args: Expression[], env: Environment) => {
      return 2 ** (evaluateExpression(args[0], env) as number);
    },

    pow: (args: Expression[], env: Environment) => {
      return (
        (evaluateExpression(args[0], env) as number) ** (evaluateExpression(args[1], env) as number)
      );
    },

    max: (args: Expression[], env: Environment) => {
      return Math.max(
        evaluateExpression(args[0], env) as number,
        evaluateExpression(args[1], env) as number,
      );
    },

    "%": (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("Modulo operation requires exactly two arguments");
      }
      return Number(evaluateExpression(args[0], env)) % Number(evaluateExpression(args[1], env));
    },

    read: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("read operation requires exactly two arguments");
      }
      const topic = evaluateExpression(args[0], env);
      const msgs = read(topic as string);
      return msgs;
    },

    floor: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("floor operation requires exactly one arguments");
      }
      return Math.floor(Number(evaluateExpression(args[0], env)));
    },

    abs: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("abs operation requires exactly one arguments");
      }
      return Math.abs(Number(evaluateExpression(args[0], env)));
    },

    round: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("round operation requires exactly one arguments");
      }
      return Math.round(Number(evaluateExpression(args[0], env)));
    },

    ceil: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("floor operation requires exactly one arguments");
      }
      return Math.ceil(Number(evaluateExpression(args[0], env)));
    },

    random: () => Math.random(),

    ">": (args: Expression[], env: Environment) => {
      return Number(evaluateExpression(args[0], env)) > Number(evaluateExpression(args[1], env));
    },

    "<": (args: Expression[], env: Environment) => {
      return Number(evaluateExpression(args[0], env)) < Number(evaluateExpression(args[1], env));
    },

    ">=": (args: Expression[], env: Environment) => {
      const [a1, b1] = [
        Number(evaluateExpression(args[0], env)),
        Number(evaluateExpression(args[1], env)),
      ];
      return a1 >= b1;
    },

    "<=": (args: Expression[], env: Environment) => {
      return Number(evaluateExpression(args[0], env)) <= Number(evaluateExpression(args[1], env));
    },

    "list?": (args: Expression[], env: Environment) => {
      return Array.isArray(evaluateExpression(args[0], env));
    },

    slice: (args: Expression[], env: Environment) => {
      let array = evaluateExpression(args[0], env);
      if (ArrayBuffer.isView(array)) {
        array = Array.from(array as Float32Array);
      }
      if (!Array.isArray(array)) {
        throw new Error("must be an array");
      }
      return args.length === 3
        ? array.slice(
            Number(evaluateExpression(args[1], env)),
            Number(evaluateExpression(args[2], env)),
          )
        : array.slice(Number(evaluateExpression(args[1], env)));
    },

    "==": (args: Expression[], env: Environment) => {
      return evaluateExpression(args[0], env) === evaluateExpression(args[1], env);
    },

    "!=": (args: Expression[], env: Environment) => {
      return evaluateExpression(args[0], env) !== evaluateExpression(args[1], env);
    },

    and: (args: Expression[], env: Environment) => {
      return args.every((arg) => Boolean(evaluateExpression(arg, env)));
    },

    or: (args: Expression[], env: Environment) => {
      let _last: Message | null = null;
      for (const arg of args) {
        const a = evaluateExpression(arg, env);
        _last = a;
        if (a) {
          return a;
        }
      }
      return _last;
    },

    not: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("Not operation requires exactly one argument");
      }
      return !evaluateExpression(args[0], env);
    },

    if: (args: Expression[], env: Environment) => {
      if (args.length !== 3) {
        throw new Error("If statement requires exactly three arguments");
      }
      const cond = evaluateExpression(args[0], env);
      return cond ? evaluateExpression(args[1], env) : evaluateExpression(args[2], env);
    },

    list: (args: Expression[], env: Environment) => {
      return args.map((arg) => evaluateExpression(arg, env));
    },

    car: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("First operation requires exactly one argument");
      }
      const firstArg = evaluateExpression(args[0], env);
      if (!Array.isArray(firstArg) && !ArrayBuffer.isView(firstArg)) {
        throw new Error("car operation requires a list argument");
      }
      if (Array.isArray(firstArg)) {
        return firstArg[0] ?? null;
      }
      return (firstArg as Float32Array)[0] ?? null;
    },

    s: (args: Expression[], env: Environment) => {
      let last: Message | undefined = undefined;
      for (const arg of args) {
        last = evaluateExpression(arg, env);
      }
      return last as Message;
    },

    get: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("get operation requires exactly two arguments");
      }
      const a = evaluateExpression(args[0], env);
      const b =
        typeof args[1] === "string" ? toStringLiteral(args[1]) : evaluateExpression(args[1], env);

      if (Array.isArray(a)) {
        return a?.[b as number];
      }
      return (a as Record<string, Message>)[b as string];
    },

    cdr: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("cdr operation requires exactly one argument");
      }
      let cdrArg = evaluateExpression(args[0], env);

      if (!Array.isArray(cdrArg) && !ArrayBuffer.isView(cdrArg)) {
        throw new Error("cdr operation requires a list argument");
      }
      if (((cdrArg as Message[]) || Float32Array).length <= 1) {
        return pool.get();
      }

      const cdrResult = pool.get();

      if (ArrayBuffer.isView(cdrArg)) {
        cdrArg = Array.from(cdrArg as Float32Array);
      }

      for (let i = 1; i < (cdrArg as Message[] | Float32Array).length; i++) {
        cdrResult[i - 1] = (cdrArg as Message[] | Float32Array)[i];
      }
      cdrResult.length = (cdrArg as Message[] | Float32Array).length - 1;

      return cdrResult;
    },

    cons: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("cons operation requires exactly 2 arguments");
      }

      const cons = pool.get();
      cons[0] = evaluateExpression(args[0], env);

      const bValue = evaluateExpression(args[1], env);
      if (Array.isArray(bValue)) {
        for (let i = 0; i < bValue.length; i++) {
          cons[i + 1] = bValue[i];
        }
      } else {
        cons[1] = bValue;
      }

      return cons;
    },

    nil: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("nul operation requires exactly 1 arguments");
      }
      const _nil = evaluateExpression(args[0], env);
      if (Array.isArray(_nil)) {
        return _nil.length === 0;
      }
      return _nil === null || Number.isNaN(_nil) || _nil === undefined;
    },

    concat: (args: Expression[], env: Environment) => {
      return args.reduce((result, arg) => {
        const evaluated = evaluateExpression(arg, env);
        return Array.isArray(evaluated) ? result.concat(evaluated) : [...result, evaluated];
      }, [] as Message[]);
    },

    length: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("Length operation requires exactly one argument");
      }
      const lengthArg = evaluateExpression(args[0], env);
      if (
        typeof lengthArg === "string" ||
        Array.isArray(lengthArg) ||
        ArrayBuffer.isView(lengthArg)
      ) {
        return (lengthArg as Message[] | Float32Array | string).length;
      }
      throw new Error("Length operation requires a string or list argument");
    },

    switch: (args: Expression[], env: Environment) => {
      if (args.length < 2) {
        throw new Error("Switch requires at least a condition and one case");
      }

      const condition = evaluateExpression(args[0], env);
      const cases = args.slice(1);

      // Handle the default case (last argument if it's not a pair)
      const hasDefault = true;
      const defaultCase = hasDefault ? cases.pop() : null;

      // Check each case
      for (const caseExpr of cases) {
        if (!Array.isArray(caseExpr) || caseExpr.length !== 2) {
          throw new Error("Switch cases must be pairs of [pattern, expression]");
        }

        const [pattern, expr] = caseExpr;
        const patternValue = evaluateExpression(pattern, env);

        if (patternValue === condition) {
          return evaluateExpression(expr, env);
        }
      }

      // If no matches found, evaluate default case if it exists
      return defaultCase ? evaluateExpression(defaultCase, env) : null;
    },

    querypatch: (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("querypatch operation requires exactly one argument");
      }
      const tagList = evaluateExpression(args[0], env);
      if (!Array.isArray(tagList)) {
        throw new Error("querypatch operation requires a list of tags");
      }
      return registry.query(tagList as string[]);
    },

    send: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("querypatch operation requires exactly one argument");
      }
      const messageType = evaluateExpression(args[0], env);
      const message = evaluateExpression(args[1], env);
      publish(messageType as string, message as string);
      return message;
    },

    sendpatch: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("sendpatch operation requires exactly two arguments");
      }
      const registeredPatch: RegisteredPatch = evaluateExpression(args[0], env) as RegisteredPatch;

      const message = evaluateExpression(args[1], env);
      const patch = registeredPatch.patch;
      const parentNode = patch.parentNode;
      parentNode.receive(parentNode.inlets[0], message as Core.Message);
      return message;
    },

    "get-state": (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("get-state operation requires exactly one argument");
      }
      const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;
      return node.getJSON();
    },

    "set-state": (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("set-state operation requires exactly two arguments");
      }
      const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;
      node.fromJSON(evaluateExpression(args[1], env) as Core.SerializedObjectNode);
      return node.getJSON();
    },

    sendnode: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("sendpatch operation requires exactly two arguments");
      }
      const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;

      const message = evaluateExpression(args[1], env);
      node.receive(node.inlets[0], message as Core.Message);
      return message;
    },

    "by-scripting-name": (args: Expression[], env: Environment) => {
      if (args.length !== 1) {
        throw new Error("by-scripting-name operation requires exactly one argument");
      }
      const scriptingName = evaluateExpression(args[0], env);
      const patch = getRootPatch(objectNode.patch);
      const nodes = patch.scriptingNameToNodes[scriptingName as string];
      return nodes;
    },

    "null?": (args: Expression[], env: Environment) => {
      const e = evaluateExpression(args[0], env);
      if (Array.isArray(e) && e.length === 0) {
        return true;
      }
      return false;
    },

    set: (args: Expression[], env: Environment) => {
      if (args.length !== 2) {
        throw new Error("set operation requires exactly two arguments");
      }
      if (!isSymbol(args[0])) {
        throw new Error("set operation requires string for variable name");
      }
      const setSymbol = (args[0] as Symbol).value;
      env[setSymbol] = evaluateExpression(args[1], env);
      return env[setSymbol];
    },

    print: (args: Expression[], env: Environment) => {
      const printResult = args.map((arg) => evaluateExpression(arg, env));
      console.log("lisp print=", printResult);
      return printResult[printResult.length - 1] ?? null;
    },
  };

  function evaluateList(list: Expression[], env: Environment): Message {
    if (list.length === 0) return null;

    const [_func, ..._args] = list;
    // Cache function lookup result
    const func = evaluateExpression(_func, env, 0) || _func;

    // Fast path for common operators
    if (isSymbol(func)) {
      const symbol = (func as Symbol).value;
      const operator = operators[symbol as keyof typeof operators];
      if (operator) {
        return operator(shapeArgs(_args, env), env);
      }

      const symbolFn = `${symbol}_fn`;
      if (symbolFn in env) {
        const fn = env[symbolFn];
        if (typeof fn === "function") {
          const evaluatedArgs = shapeArgs(_args, env).map((arg) => evaluateExpression(arg, env));
          return fn(env)(...evaluatedArgs);
        }
      }

      console.log("function missing", func);
      throw new Error(`Unknown function: ${func}`);
    }

    // Regular path for other functions
    const args = shapeArgs(_args, env);
    if (typeof func === "function") {
      const evaluatedArgs = args.map((arg) => evaluateExpression(arg, env));
      return func(env)(...evaluatedArgs);
    }
    return list;
  }

  function evaluateObject(obj: ObjectLiteral, env: Environment): Message {
    const result = pool.getObject();
    const _env = pool.getObject();
    Object.assign(_env, env);

    if (obj.spread) {
      const spreadValue = evaluateExpression(obj.spread, env);
      if (typeof spreadValue === "object" && spreadValue !== null) {
        Object.assign(result, spreadValue);
      } else {
        throw new Error("Spread value must be an object");
      }
      for (const key in env[obj.spread as string] as Record<string, Message>) {
        _env[key] = evaluateExpression(
          key,
          evaluateExpression(obj.spread, _env as Environment) as Record<string, Message>,
        );
      }
    }
    for (const [key, value] of Object.entries(obj.properties)) {
      result[key] = evaluateExpression(value, _env as Environment);
    }
    return result;
  }

  function evaluateAtom(atom: Atom, env: Environment, index = 0): Message {
    if (isSymbol(atom)) {
      const inputKey = (atom as Symbol).value;
      const fnKey = `${inputKey}_fn`;
      if (index === 0 && fnKey in env) {
        return env[fnKey];
      }

      if (inputKey in env) {
        return env[inputKey];
      }
      if (inputKey.startsWith("$")) {
        throw new Error(`Unknown input: ${inputKey}`);
      }
      return null;
    }
    if (typeof atom === "string") {
      if (stringCache[atom]) {
        return stringCache[atom];
      }
      atom = atom.trim().slice(1, atom.length - 1);
      stringCache[atom] = atom;
    }
    return atom;
  }

  function defineFunctionInEnv(funcDef: FunctionDefinition, env: Environment): Message {
    const { params, body } = funcDef;
    env[params[0].value + "_fn"] = (callScope: Environment) => {
      return (...args: Message[]) => {
        const localEnv = Object.create(null);

        Object.assign(localEnv, env, callScope);

        for (let i = 1; i < params.length; i++) {
          const index = i - 1;
          const param = params[i];
          if (param.value === "...") {
            i++;
            const restParam = params[i].value;
            const rest = args.slice(index);
            localEnv[restParam as string] = rest;
          } else {
            localEnv[param.value as string] = args[index];
          }
        }

        const result = evaluateExpression(body, localEnv);
        pool.releaseObject(localEnv);
        return result;
      };
    };
    return null;
  }

  const isStringLiteral = (x: string) => {
    return x.trim().startsWith('"') && x.trim().endsWith('"');
  };
  const toStringLiteral = (x: string) => {
    const trimmed = x.trim();
    return trimmed.slice(1, trimmed.length - 1);
  };
  return evaluate;
};
