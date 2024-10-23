import { type RegisteredPatch, registry } from "../nodes/definitions/core/registry";
import * as Core from "../nodes/types";
import { read } from "@/lib/messaging/queue";
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

const stringCache: { [x: string]: string } = {};

export const createContext = (pool: ListPool) => {
  function evaluate(expressions: Expression[], env: Environment): Message {
    let result: Message = null;
    for (const expr of expressions) {
      result = evaluateExpression(expr, env);
    }
    return result;
  }

  function evaluateExpression(expr: Expression, env: Environment): Message {
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
      return evaluateAtom(expr, env);
    };
    const r = e();
    return r;
  }

  function evaluateList(list: Expression[], env: Environment): Message {
    if (list.length === 0) {
      return null;
    }
    const [_func, ...args] = list;
    const func = evaluateExpression(_func, env) || _func;

    if (typeof func === "function") {
      const evaluatedArgs = args.map((arg) => evaluateExpression(arg, env));
      const fn = func;
      return fn(env)(...evaluatedArgs);
    }
    if (isSymbol(func)) {
      const symbol = (func as Symbol).value;
      if (symbol in env) {
        const fn = env[symbol];
        if (typeof fn === "function") {
          const evaluatedArgs = args.map((arg) => evaluateExpression(arg, env));
          return fn(env)(...evaluatedArgs);
        }
      }

      switch (symbol) {
        case "defun":
          if (args.length !== 3) {
            throw new Error("defun requires a name, a list of parameters, and a body");
          }
          if (!Array.isArray(args[1])) {
            throw new Error("defun requires list as first arg");
          }
          {
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
          }
        case "lambda": {
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
        }
        case "let": {
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
        }
        case "fill": {
          if (args.length !== 2) {
            throw new Error("fill requires exactly two arguments: a function and a list");
          }
          const fillSize = evaluateExpression(args[0], env);
          const fillValue = evaluateExpression(args[1], env);
          return new Array(fillSize as number).fill(fillValue);
        }
        case "map": {
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
        }
        case "+": {
          return args.reduce(
            (sum, arg) => (sum as number) + Number(evaluateExpression(arg, env)),
            0,
          );
        }
        case "-": {
          if (args.length === 1) {
            return -Number(evaluateExpression(args[0], env));
          }
          return Number(
            (evaluateExpression(args[0], env) as number) -
              (evaluateExpression(args[1], env) as number),
          );
        }
        case "*": {
          return args.reduce(
            (product, arg) => (product as number) * Number(evaluateExpression(arg, env)),
            1,
          );
        }
        case "/": {
          return Number(
            (evaluateExpression(args[0], env) as number) /
              (evaluateExpression(args[1], env) as number),
          );
        }
        case "exp2": {
          return 2 ** (evaluateExpression(args[0], env) as number);
        }
        case "pow": {
          return (
            (evaluateExpression(args[0], env) as number) **
            (evaluateExpression(args[1], env) as number)
          );
        }
        case "%": {
          if (args.length !== 2) {
            throw new Error("Modulo operation requires exactly two arguments");
          }
          return (
            Number(evaluateExpression(args[0], env)) % Number(evaluateExpression(args[1], env))
          );
        }
        case "read": {
          if (args.length !== 1) {
            throw new Error("read operation requires exactly two arguments");
          }
          const topic = evaluateExpression(args[0], env);
          const msgs = read(topic as string);
          return msgs;
        }
        case "floor": {
          if (args.length !== 1) {
            throw new Error("floor operation requires exactly one arguments");
          }
          return Math.floor(Number(evaluateExpression(args[0], env)));
        }
        case "abs": {
          if (args.length !== 1) {
            throw new Error("abs operation requires exactly one arguments");
          }
          return Math.abs(Number(evaluateExpression(args[0], env)));
        }
        case "round": {
          if (args.length !== 1) {
            throw new Error("round operation requires exactly one arguments");
          }
          return Math.round(Number(evaluateExpression(args[0], env)));
        }
        case "ceil": {
          if (args.length !== 1) {
            throw new Error("floor operation requires exactly one arguments");
          }
          return Math.ceil(Number(evaluateExpression(args[0], env)));
        }
        case "random":
          return Math.random();
        case ">": {
          return (
            Number(evaluateExpression(args[0], env)) > Number(evaluateExpression(args[1], env))
          );
        }
        case "<":
          return (
            Number(evaluateExpression(args[0], env)) < Number(evaluateExpression(args[1], env))
          );
        case ">=": {
          const [a1, b1] = [
            Number(evaluateExpression(args[0], env)),
            Number(evaluateExpression(args[1], env)),
          ];
          return a1 >= b1;
        }
        case "<=":
          return (
            Number(evaluateExpression(args[0], env)) <= Number(evaluateExpression(args[1], env))
          );
        case "slice": {
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
        }
        case "==":
          return evaluateExpression(args[0], env) === evaluateExpression(args[1], env);
        case "!=":
          return evaluateExpression(args[0], env) !== evaluateExpression(args[1], env);
        case "and":
          return args.every((arg) => Boolean(evaluateExpression(arg, env)));
        case "or": {
          let i = 0;
          let _last: Message | null = null;
          for (const arg of args) {
            const a = evaluateExpression(arg, env);
            _last = a;
            if (a) {
              return a;
            }
            i++;
          }
          return _last;
        }
        case "not":
          if (args.length !== 1) {
            throw new Error("Not operation requires exactly one argument");
          }
          return !evaluateExpression(args[0], env);
        case "if": {
          if (args.length !== 3) {
            throw new Error("If statement requires exactly three arguments");
          }
          const cond = evaluateExpression(args[0], env);
          return cond ? evaluateExpression(args[1], env) : evaluateExpression(args[2], env);
        }
        case "list":
          return args.map((arg) => evaluateExpression(arg, env));
        case "car": {
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
        }
        case "s": {
          let last: Message | undefined = undefined;
          for (const arg of args) {
            last = evaluateExpression(arg, env);
          }
          return last as Message;
        }
        case "get": {
          if (args.length !== 2) {
            throw new Error("get operation requires exactly two arguments");
          }
          const a = evaluateExpression(args[0], env);
          const b =
            typeof args[1] === "string"
              ? toStringLiteral(args[1])
              : evaluateExpression(args[1], env);

          if (Array.isArray(a)) {
            return a?.[b as number];
          }
          return (a as Record<string, Message>)[b as string];
        }
        case "cdr": {
          if (args.length !== 1) {
            throw new Error("cdr operation requires exactly one argument");
          }
          let cdrArg = evaluateExpression(args[0], env);

          if (!Array.isArray(cdrArg) && !ArrayBuffer.isView(cdrArg)) {
            throw new Error("cdr operation requires a list argument");
          }
          if (((cdrArg as Message[]) || Float32Array).length <= 1) {
            // If the list has 0 or 1 elements, return an empty list from the pool
            return pool.get();
          }

          // Create a new list from the pool for the result
          const cdrResult = pool.get();

          // If it's a TypedArray, convert to a regular array first
          if (ArrayBuffer.isView(cdrArg)) {
            cdrArg = Array.from(cdrArg as Float32Array);
          }

          // Copy all elements except the first one
          for (let i = 1; i < (cdrArg as Message[] | Float32Array).length; i++) {
            cdrResult[i - 1] = (cdrArg as Message[] | Float32Array)[i];
          }
          cdrResult.length = (cdrArg as Message[] | Float32Array).length - 1; // Ensure correct length

          return cdrResult;
        }
        case "cons": {
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
        }
        case "nil": {
          if (args.length !== 1) {
            throw new Error("nul operation requires exactly 1 arguments");
          }
          const _nil = evaluateExpression(args[0], env);
          if (Array.isArray(_nil)) {
            return _nil.length === 0;
          }
          return _nil === null || Number.isNaN(_nil) || _nil === undefined;
        }
        case "concat":
          return args.reduce((result, arg) => {
            const evaluated = evaluateExpression(arg, env);
            return Array.isArray(evaluated) ? result.concat(evaluated) : [...result, evaluated];
          }, [] as Message[]);
        case "length": {
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
        }
        case "querypatch": {
          if (args.length !== 1) {
            throw new Error("querypatch operation requires exactly one argument");
          }
          const tagList = evaluateExpression(args[0], env);
          if (!Array.isArray(tagList)) {
            throw new Error("querypatch operation requires a list of tags");
          }
          return registry.query(tagList as string[]);
        }
        case "sendpatch": {
          if (args.length !== 2) {
            throw new Error("sendpatch operation requires exactly two arguments");
          }
          const registeredPatch: RegisteredPatch = evaluateExpression(
            args[0],
            env,
          ) as RegisteredPatch;

          const message = evaluateExpression(args[1], env);
          const patch = registeredPatch.patch;
          const parentNode = patch.parentNode;
          console.log("sending message to ", patch, message);
          parentNode.receive(parentNode.inlets[0], message as Core.Message);
          return message;
        }
        case "set": {
          if (args.length !== 2) {
            throw new Error("set operation requires exactly two arguments");
          }
          if (!isSymbol(args[0])) {
            throw new Error("set operation requires string for variable name");
          }
          const setSymbol = (args[0] as Symbol).value;
          env[setSymbol] = evaluateExpression(args[1], env);
          return env[setSymbol];
        }
        case "print": {
          const printResult = args.map((arg) => evaluateExpression(arg, env));
          console.log(printResult);
          return printResult[printResult.length - 1] ?? null;
        }
        default:
          console.log("missing function def=", func);
          throw new Error(`Unknown function: ${func}`);
      }
    }
    throw new Error(`Invalid function call: ${func}`);
  }

  function evaluateObject(obj: ObjectLiteral, env: Environment): Message {
    //const result: Record<string, Message> = {};
    const result = pool.getObject();
    const _env = pool.getObject();
    Object.assign(_env, env);

    //const _env = { ...env };
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
        ); // (env[obj.spread as string] as Record<string, Message>)[key];
      }
    }
    for (const [key, value] of Object.entries(obj.properties)) {
      result[key] = evaluateExpression(value, _env as Environment);
    }
    return result;
  }

  function evaluateAtom(atom: Atom, env: Environment): Message {
    if (isSymbol(atom)) {
      const inputKey = (atom as Symbol).value;
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
    env[params[0].value] = (callScope: Environment) => {
      return (...args: Message[]) => {
        const localEnv = Object.create(null); //pool.getEnv();

        Object.assign(localEnv, env, callScope);

        // const localEnv = Object.create({ ...env, ...callScope });

        params.slice(1).forEach((param, index) => {
          localEnv[param.value as string] = args[index];
        });
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
