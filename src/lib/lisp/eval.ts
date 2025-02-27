import { type RegisteredPatch, registry } from "../nodes/definitions/core/registry";
import { defineFunctionInEnv, operators } from "./operators";
import * as Core from "../nodes/types";
import type { ListPool } from "./ListPool";
import { isSymbol } from "./types";
import type {
  Expression,
  Message,
  Symbol,
  ObjectLiteral,
  Atom,
  FunctionDefinition,
  List,
  Environment,
  LocatedExpression,
} from "./types";
import { BytecodeInterpreter } from "./bytecode";

const stringCache: { [x: string]: string } = {};

export class LispError extends Error {
  constructor(
    public expression: LocatedExpression,
    message: string,
  ) {
    super(message);
    this.expression = expression;
  }
}

// Use our new bytecode interpreter instead of the tree-walking one
export const createByteCodeContext = (pool: ListPool, objectNode: Core.ObjectNode) => {
  // Create bytecode interpreter instance
  const interpreter = new BytecodeInterpreter(pool, objectNode);

  // Return the evaluation function
  return interpreter.createContext();
};

// Keep the old tree-walking interpreter for compatibility and fallback
export const createContext = (pool: ListPool, objectNode: Core.ObjectNode) => {
  function evaluate(expressions: LocatedExpression[], env: Environment): Message {
    for (const key in env) {
      if (key.endsWith("_patterns")) {
        delete env[key];
      }
    }
    let result: Message = null;
    for (const expr of expressions) {
      result = evaluateExpression(expr, env);
    }
    return result;
  }

  function evaluateExpression(
    locatedExpression: LocatedExpression,
    env: Environment,
    index = 1,
  ): Message {
    const expr = locatedExpression.expression;
    const e = () => {
      if (Array.isArray(expr)) {
        return evaluateList(locatedExpression, env);
      }
      if (typeof expr === "object" && expr !== null) {
        if ("type" in expr) {
          if (expr.type === "object") {
            return evaluateObject(expr, env);
          }
          if (expr.type === "function") {
            return defineFunctionInEnv(expr, env, pool, evaluateExpression);
          }
        }
      }
      return evaluateAtom(expr, env, index);
    };
    const r = e();
    return r;
  }

  const shapeArgs = (args: LocatedExpression[], env: Environment): LocatedExpression[] => {
    const _args: LocatedExpression[] = new Array(args.length);
    let argIndex = 0;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const symbol = args[i].expression as Symbol;
      if (symbol.type === "Symbol" && symbol.value === "...") {
        const evaluated_arg = evaluateExpression(args[++i], env, i);
        if (Array.isArray(evaluated_arg)) {
          const len = evaluated_arg.length;
          for (let j = 0; j < len; j++) {
            _args[argIndex++] = {
              expression: evaluated_arg[j],
              location: arg.location,
            };
          }
        }
      } else {
        _args[argIndex++] = args[i];
      }
    }
    _args.length = argIndex;
    return _args;
  };

  const OPERATORS = operators(evaluateExpression, pool, objectNode);
  function evaluateList(expression: LocatedExpression, env: Environment): Message {
    const list = expression.expression as List;
    if (list.length === 0) return null;

    const [_func, ..._args] = list;

    if (_func["expression"] === undefined) {
      return list;
    }
    // Cache function lookup result
    const func = evaluateExpression(_func, env, 0) || _func;

    // Fast path for common operators
    if (isSymbol(func)) {
      const symbol = ((func as LocatedExpression).expression as Symbol).value;
      const operator = OPERATORS[symbol as keyof typeof operators] as (x: any) => void;
      if (operator) {
        return (operator(expression) as unknown as (x: any, y: any) => Message)(
          shapeArgs(_args, env),
          env,
        );
      }

      const symbolFn = `${symbol}_fn`;
      if (symbolFn in env) {
        const fn = env[symbolFn];
        if (typeof fn === "function") {
          const evaluatedArgs = shapeArgs(_args, env).map((arg) => {
            return evaluateExpression(arg, env);
          });
          return fn(env)(...evaluatedArgs);
        }
      }

      throw new LispError(expression, `Unknown function: ${symbol}`);
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
      for (const key in env[obj.spread.expression as string] as Record<string, Message>) {
        _env[key] = evaluateExpression(
          { expression: key, location: obj.spread.location },
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
  return evaluate;
};
