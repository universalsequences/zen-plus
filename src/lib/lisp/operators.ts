import { type RegisteredPatch, registry } from "../nodes/definitions/core/registry";
import { LispError } from "./eval";
import * as Core from "../nodes/types";
import { ObjectNode } from "@/lib/nodes/types";
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
  Pattern,
  LocatedExpression,
} from "./types";
import { getRootPatch } from "../nodes/traverse";

export const operators = (
  evaluateExpression: (exp: LocatedExpression, env: Environment, index?: number) => Message,
  pool: ListPool,
  objectNode: ObjectNode,
) => ({
  def: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const funcName = args[0].expression as Symbol;
    const params = args[1].expression;
    const body = args[2];

    const key = `${funcName.value}_patterns`;
    const patterns = (env[key] || []) as Pattern[];
    // Add new pattern for this function
    patterns.push({ params: params as LocatedExpression[], body });
    env[key] = patterns;

    // Create or update function that checks patterns
    env[`${funcName.value}_fn`] = (callScope: Environment) => {
      return (...args: Message[]) => {
        const patterns = env[key] as Pattern[];
        // Find matching pattern
        for (const pattern of patterns) {
          const matched = matchPattern(pattern.params, args);
          if (matched) {
            const localEnv = Object.create(null);
            Object.assign(localEnv, env, callScope);
            bindMatchedValues(pattern.params, args, localEnv);
            const result = evaluateExpression(pattern.body, localEnv);
            pool.releaseObject(localEnv);
            return result;
          }
        }
        throw new LispError(expression, `No matching pattern for ${funcName.value}`);
      };
    };
    return null;
  },
  defun: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 3) {
      throw new Error("defun requires a name, a list of parameters, and a body");
    }
    if (!Array.isArray(args[1].expression)) {
      throw new Error("defun requires list as first arg");
    }
    const funcName = args[0].expression as Symbol;
    const _params = args[1].expression;
    const defunBody = args[2];
    if (!isSymbol(funcName)) {
      throw new LispError(expression, "Function name must be a symbol");
    }
    return defineFunctionInEnv(
      {
        type: "function",
        params: [
          funcName as unknown as Symbol,
          ...(_params as unknown as Symbol[]),
        ] as unknown as LocatedExpression[],
        body: defunBody,
      },
      env,
      pool,
      evaluateExpression,
    );
  },

  lambda: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2 || !Array.isArray(args[0].expression)) {
      throw new LispError(expression, "Lambda expression must have parameter list and body");
    }
    const params = args[0].expression.map((x) => x.expression as Symbol) as Symbol[];
    if (params.some((x) => !isSymbol(x))) {
      throw new LispError(expression, "Lambda expression must have parameter list of symbols");
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

  let: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length < 2) {
      throw new LispError(expression, "Let requires at least two arguments: bindings and body");
    }
    const bindings = args[0].expression;
    const letBody = args.slice(1);

    if (!Array.isArray(bindings)) {
      throw new LispError(expression, "First argument to let must be a list of bindings");
    }

    const localEnv = Object.create(env);
    for (let i = 0; i < bindings.length; i += 1) {
      const b = bindings[i];
      if (!Array.isArray(b.expression)) {
        throw new LispError(expression, "let variables must be lists");
      }
      const [varName, varValue] = b.expression;
      if (!isSymbol(varName)) {
        throw new LispError(expression, "Variable name in let binding must be a symbol");
      }
      localEnv[(varName.expression as Symbol).value] = evaluateExpression(varValue, localEnv);
    }

    let result: Message = null;
    if (!letBody) {
      throw new LispError(expression, "must have body for let");
    }
    for (const expr of letBody) {
      result = evaluateExpression(expr, localEnv);
    }
    return result;
  },

  fill: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "fill requires exactly two arguments: a function and a list");
    }
    const fillSize = evaluateExpression(args[0], env);
    const fillValue = evaluateExpression(args[1], env);
    return new Array(fillSize as number).fill(fillValue);
  },

  map: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "Map requires exactly two arguments: a function and a list");
    }
    const mapFunc = evaluateExpression(args[0], env);
    let mapList = evaluateExpression(args[1], env);

    if (typeof mapFunc !== "function") {
      throw new LispError(expression, "First argument to map must be a function");
    }
    if (ArrayBuffer.isView(mapList)) {
      mapList = Array.from(mapList as Float32Array);
    }
    if (!Array.isArray(mapList)) {
      throw new LispError(expression, "Second argument to map must be a list");
    }

    return mapList.map((item, index) => {
      if (typeof mapFunc === "function") {
        return mapFunc(env)(item, index);
      }
      throw new LispError(expression, "Unexpected error: mapFunc is not a function");
    });
  },

  filter: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "Map requires exactly two arguments: a function and a list");
    }
    const mapFunc = evaluateExpression(args[0], env);
    let mapList = evaluateExpression(args[1], env);

    if (typeof mapFunc !== "function") {
      throw new LispError(expression, "First argument to map must be a function");
    }
    if (ArrayBuffer.isView(mapList)) {
      mapList = Array.from(mapList as Float32Array);
    }
    if (!Array.isArray(mapList)) {
      throw new LispError(expression, "Second argument to map must be a list");
    }

    return mapList.filter((item, index) => {
      if (typeof mapFunc === "function") {
        return mapFunc(env)(item, index);
      }
      throw new LispError(expression, "Unexpected error: mapFunc is not a function");
    });
  },

  "+": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length === 0) return 0;
    
    // Start with initial value of 0 or empty string
    let result = 0;
    
    // Evaluate each argument and add to result
    for (let i = 0; i < args.length; i++) {
      const value = evaluateExpression(args[i], env);
      
      // First value determines if we're doing string concat or number addition
      if (i === 0 && typeof value === "string") {
        result = "";
      }
      
      result = (result as any) + value;
    }
    
    return result;
  },

  "-": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length === 0) {
      throw new Error("Subtraction requires at least one argument");
    }
    
    if (args.length === 1) {
      // Unary negation
      return -Number(evaluateExpression(args[0], env));
    }
    
    // Binary subtraction
    const minuend = Number(evaluateExpression(args[0], env));
    const subtrahend = Number(evaluateExpression(args[1], env));
    return minuend - subtrahend;
  },

  "*": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length === 0) return 1;
    
    let result = 1;
    
    // Evaluate each argument and multiply with result
    for (let i = 0; i < args.length; i++) {
      result *= Number(evaluateExpression(args[i], env));
    }
    
    return result;
  },

  "/": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new Error("Division requires exactly two arguments");
    }
    
    const dividend = Number(evaluateExpression(args[0], env));
    const divisor = Number(evaluateExpression(args[1], env));
    
    if (divisor === 0) {
      throw new Error("Division by zero");
    }
    
    return dividend / divisor;
  },

  dot: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const a = evaluateExpression(args[0], env) as number[];
    const b = evaluateExpression(args[1], env) as number[];
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  },

  stride: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
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

  cross: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const a = evaluateExpression(args[0], env) as number[];
    const b = evaluateExpression(args[1], env) as number[];
    const len = Math.min(a.length, b.length);
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = a[i] * b[i];
    }
    return result;
  },

  cross_sub: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const a = evaluateExpression(args[0], env) as number[];
    const b = evaluateExpression(args[1], env) as number[];
    const len = Math.min(a.length, b.length);
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = a[i] - b[i];
    }
    return result;
  },

  cross_add: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const a = evaluateExpression(args[0], env) as number[];
    const b = evaluateExpression(args[1], env) as number[];
    const len = Math.min(a.length, b.length);
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = a[i] + b[i];
    }
    return result;
  },

  exp2: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return 2 ** (evaluateExpression(args[0], env) as number);
  },

  pow: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return (
      (evaluateExpression(args[0], env) as number) ** (evaluateExpression(args[1], env) as number)
    );
  },

  max: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return Math.max(
      evaluateExpression(args[0], env) as number,
      evaluateExpression(args[1], env) as number,
    );
  },

  "%": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "Modulo operation requires exactly two arguments");
    }
    return Number(evaluateExpression(args[0], env)) % Number(evaluateExpression(args[1], env));
  },

  read: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "read operation requires exactly two arguments");
    }
    const topic = evaluateExpression(args[0], env);
    const msgs = read(topic as string);
    return [msgs[0]];
  },

  floor: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "floor operation requires exactly one arguments");
    }
    return Math.floor(Number(evaluateExpression(args[0], env)));
  },

  abs: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "abs operation requires exactly one arguments");
    }
    return Math.abs(Number(evaluateExpression(args[0], env)));
  },

  round: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "round operation requires exactly one arguments");
    }
    return Math.round(Number(evaluateExpression(args[0], env)));
  },

  ceil: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "floor operation requires exactly one arguments");
    }
    return Math.ceil(Number(evaluateExpression(args[0], env)));
  },

  random: (expression: LocatedExpression) => () => Math.random(),

  ">": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return Number(evaluateExpression(args[0], env)) > Number(evaluateExpression(args[1], env));
  },

  "<": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return Number(evaluateExpression(args[0], env)) < Number(evaluateExpression(args[1], env));
  },

  ">=": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const [a1, b1] = [
      Number(evaluateExpression(args[0], env)),
      Number(evaluateExpression(args[1], env)),
    ];
    return a1 >= b1;
  },

  "<=": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return Number(evaluateExpression(args[0], env)) <= Number(evaluateExpression(args[1], env));
  },

  "list?": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return Array.isArray(evaluateExpression(args[0], env));
  },

  slice: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
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

  "==": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return evaluateExpression(args[0], env) === evaluateExpression(args[1], env);
  },

  "!=": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return evaluateExpression(args[0], env) !== evaluateExpression(args[1], env);
  },

  and: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return args.every((arg) => Boolean(evaluateExpression(arg, env)));
  },

  or: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
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

  not: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "Not operation requires exactly one argument");
    }
    return !evaluateExpression(args[0], env);
  },

  if: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 3) {
      throw new LispError(expression, "If statement requires exactly three arguments");
    }
    const cond = evaluateExpression(args[0], env);
    return cond ? evaluateExpression(args[1], env) : evaluateExpression(args[2], env);
  },

  list: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const result = [];
    for (let i = 0; i < args.length; i++) {
      result.push(evaluateExpression(args[i], env));
    }
    return result;
  },

  car: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "First operation requires exactly one argument");
    }
    const firstArg = evaluateExpression(args[0], env);
    if (!Array.isArray(firstArg) && !ArrayBuffer.isView(firstArg)) {
      throw new LispError(expression, "car operation requires a list argument");
    }
    if (Array.isArray(firstArg)) {
      return firstArg[0] ?? null;
    }
    return (firstArg as Float32Array)[0] ?? null;
  },

  s: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    let last: Message | undefined = undefined;
    for (const arg of args) {
      last = evaluateExpression(arg, env);
    }
    return last as Message;
  },

  get: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "get operation requires exactly two arguments");
    }
    const a = evaluateExpression(args[0], env);
    const b =
      typeof args[1] === "string" ? toStringLiteral(args[1]) : evaluateExpression(args[1], env);

    if (Array.isArray(a)) {
      return a?.[b as number];
    }
    return (a as Record<string, Message>)[b as string];
  },

  cdr: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "cdr operation requires exactly one argument");
    }
    let cdrArg = evaluateExpression(args[0], env);

    if (!Array.isArray(cdrArg) && !ArrayBuffer.isView(cdrArg)) {
      throw new LispError(expression, "cdr operation requires a list argument");
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

  cons: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "cons operation requires exactly 2 arguments");
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

  nil: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "nul operation requires exactly 1 arguments");
    }
    const _nil = evaluateExpression(args[0], env);
    if (Array.isArray(_nil)) {
      return _nil.length === 0;
    }
    return _nil === null || Number.isNaN(_nil) || _nil === undefined;
  },

  concat: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    return args.reduce((result, arg) => {
      const evaluated = evaluateExpression(arg, env);
      return Array.isArray(evaluated) ? result.concat(evaluated) : [...result, evaluated];
    }, [] as Message[]);
  },

  length: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "Length operation requires exactly one argument");
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

  switch: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length < 2) {
      throw new LispError(expression, "Switch requires at least a condition and one case");
    }

    const condition = evaluateExpression(args[0], env);
    const cases = args.slice(1);

    // Handle the default case (last argument if it's not a pair)
    const hasDefault = true;
    const defaultCase = hasDefault ? cases.pop() : null;

    // Check each case
    for (const caseExpr of cases) {
      if (!Array.isArray(caseExpr.expression) || caseExpr.expression.length !== 2) {
        throw new Error("Switch cases must be pairs of [pattern, expression]");
      }

      const [pattern, expr] = caseExpr.expression;
      const patternValue = evaluateExpression(pattern, env);

      if (patternValue === condition) {
        return evaluateExpression(expr, env);
      }
    }

    // If no matches found, evaluate default case if it exists
    return defaultCase ? evaluateExpression(defaultCase, env) : null;
  },

  querypatch: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "querypatch operation requires exactly one argument");
    }
    const tagList = evaluateExpression(args[0], env);
    if (!Array.isArray(tagList)) {
      throw new Error("querypatch operation requires a list of tags");
    }
    return registry.query(tagList as string[]);
  },

  send: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "querypatch operation requires exactly one argument");
    }
    const messageType = evaluateExpression(args[0], env);
    const message = evaluateExpression(args[1], env);
    publish(messageType as string, message as string);
    return message;
  },

  sendpatch: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "sendpatch operation requires exactly two arguments");
    }
    const registeredPatch: RegisteredPatch = evaluateExpression(args[0], env) as RegisteredPatch;

    const message = evaluateExpression(args[1], env);
    const patch = registeredPatch.patch;
    const parentNode = patch.parentNode;
    parentNode.receive(parentNode.inlets[0], message as Core.Message);
    return message;
  },

  "get-state": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 1) {
      throw new LispError(expression, "get-state operation requires exactly one argument");
    }
    const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;
    return node.getJSON();
  },

  "set-state": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "set-state operation requires exactly two arguments");
    }
    const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;
    node.fromJSON(evaluateExpression(args[1], env) as Core.SerializedObjectNode);
    return node.getJSON();
  },

  sendnode: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "sendpatch operation requires exactly two arguments");
    }
    const node: Core.ObjectNode = evaluateExpression(args[0], env) as Core.ObjectNode;

    const message = evaluateExpression(args[1], env);
    node.receive(node.inlets[0], message as Core.Message);
    return message;
  },

  "by-scripting-name":
    (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
      if (args.length !== 1) {
        throw new LispError(
          expression,
          "by-scripting-name operation requires exactly one argument",
        );
      }
      const scriptingName = evaluateExpression(args[0], env);
      const patch = getRootPatch(objectNode.patch);
      const nodes = patch.scriptingNameToNodes[scriptingName as string];
      return nodes;
    },

  "null?": (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const e = evaluateExpression(args[0], env);
    if (Array.isArray(e) && e.length === 0) {
      return true;
    }
    return false;
  },

  set: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    if (args.length !== 2) {
      throw new LispError(expression, "set operation requires exactly two arguments");
    }
    if (!isSymbol(args[0])) {
      throw new Error("set operation requires string for variable name");
    }
    const setSymbol = (args[0].expression as Symbol).value;
    env[setSymbol] = evaluateExpression(args[1], env);
    return env[setSymbol];
  },

  print: (expression: LocatedExpression) => (args: LocatedExpression[], env: Environment) => {
    const printResult = args.map((arg) => evaluateExpression(arg, env));
    console.log("lisp print=", printResult);
    return printResult[printResult.length - 1] ?? null;
  },
});

function matchPattern(pattern: LocatedExpression[], args: Message[]): boolean {
  if (pattern.length !== args.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i].expression;
    const arg = args[i];

    if ((p as ObjectLiteral).type === "object") {
      if (typeof arg !== "object") {
        return false;
      }
      const argObject = arg as Record<string, Message>;
      const pObject = p as ObjectLiteral;

      for (const [key, value] of Object.entries(pObject.properties)) {
        if (isSymbol(value)) continue;
        // Compare actual values from AST nodes
        const patternValue =
          typeof value === "number" ? value : trimString(value as unknown as string);
        if (argObject[key] !== patternValue) {
          return false;
        }
      }
    } else if (isSymbol(p)) {
      continue;
    } else {
      if (p !== arg) return false;
    }
  }
  return true;
}

function bindMatchedValues(pattern: LocatedExpression[], args: Message[], env: Environment) {
  // Bind original args to $1, $2 etc
  args.forEach((arg, i) => {
    env[`$${i + 1}`] = arg;
  });

  // Bind destructured values
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i].expression;
    const arg = args[i];

    if (isMap(p)) {
      // Bind variables from object pattern
      const pObject = p as ObjectLiteral;
      const argObject = arg as Core.MessageObject;
      for (const [key, value] of Object.entries(pObject.properties)) {
        if (isSymbol(value)) {
          env[(value as unknown as Symbol).value] = argObject[key];
        }
      }
    } else if (isSymbol(p)) {
      // Simple variable binding
      env[(p as Symbol).value] = arg;
    }
  }
}

export function defineFunctionInEnv(
  funcDef: FunctionDefinition,
  env: Environment,
  pool: ListPool,
  evaluateExpression: (x: LocatedExpression, env: Environment, index?: number) => void,
): Message {
  const { params, body } = funcDef;
  env[`${(params[0] as unknown as Symbol).value}_fn`] = (callScope: Environment) => {
    return (...args: Message[]) => {
      const localEnv = Object.create(null);

      Object.assign(localEnv, env, callScope);

      for (let i = 1; i < params.length; i++) {
        const index = i - 1;
        const param = params[i].expression as Symbol;
        if (param.value === "...") {
          i++;
          const restParam = (params[i].expression as Symbol).value;
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
const trimString = (x: string) => {
  return x.trim().slice(1, x.length - 1);
};

const isStringLiteral = (x: string) => {
  return x.trim().startsWith('"') && x.trim().endsWith('"');
};
const toStringLiteral = (x: string) => {
  const trimmed = x.trim();
  return trimmed.slice(1, trimmed.length - 1);
};

function isMap(value: Expression): boolean {
  return (value as ObjectLiteral).type === "object";
}
