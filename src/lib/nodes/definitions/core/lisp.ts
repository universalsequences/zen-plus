import type { Lazy, Message, ObjectNode, NodeFunction } from "../../types";
import { parse } from "@/lib/lisp/parse";
import { createContext, LispError } from "@/lib/lisp/eval";
import { doc } from "./doc";
import type { AST, Environment } from "@/lib/lisp/types";
import { ListPool } from "@/lib/lisp/ListPool";

doc("car", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "returns first element of list",
});

export const car: NodeFunction = (node: ObjectNode) => {
  return (message: Message) => {
    if (Array.isArray(message) && message.length > 0) {
      return [message[0] as Message];
    }
    return [];
  };
};

doc("cdr", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "returns rest of list",
});

export const cdr: NodeFunction = (node: ObjectNode) => {
  return (message: Message) => {
    if (Array.isArray(message) && message.length > 0) {
      return [message.slice(1) as Message];
    }
    return [];
  };
};

doc("lisp", {
  numberOfInlets: (x) => x + 1,
  numberOfOutlets: 2,
  description:
    "evaluates lisp code, processing messages coming in. each inlet is a variable: $1, $2, $3, etc.",
  outletNames: ["evaluated output", "scope"],
  isHot: false,
});

export const lisp_node: NodeFunction = (node: ObjectNode, ...args: Lazy[]) => {
  let env: Environment = {};
  let lastEnv: Environment = {};
  let lastText: string | undefined = undefined;
  let lastParsed: AST;
  const pool = node.pool || new ListPool();
  node.inlets[node.inlets.length - 1].lastMessage = env as Message;
  node.hasDynamicInlets = true;
  node.isResizable = true;

  if (node.attributes["font-size"] === 9) {
    node.attributes["font-size"] = 11;
  }

  const empty: Message[] = [];
  const out: Message[] = [];

  node.newAttribute("hide-code", false);
  node.newAttribute("release-nodes", true);

  const getEnvFromMessages = () => {
    return args[args.length - 1]() as Environment;
  };

  return (msg: Message) => {
    if (msg === "clear") {
      pool.releaseUsed();
      lastEnv = getEnvFromMessages();
      for (let key in env) {
        delete env[key];
      }
      Object.assign(env, lastEnv);
      return empty as Message[];
      // return [];
    }

    const _env = getEnvFromMessages();
    if (typeof _env === "object" && _env !== lastEnv) {
      lastEnv = _env;
      for (let key in env) {
        if (key.startsWith("$")) continue;
        delete env[key];
      }
      Object.assign(env, _env);
    }

    if (node.attributes["release-nodes"]) {
      pool.releaseUsed();
    }
    const evaluate = createContext(pool, node);
    // where do we store the script, in a attribute? lol
    //
    let a = new Date().getTime();
    if (node.script) {
      // parse it and run...
      try {
        const parsed = node.script === lastText ? lastParsed : parse(node.script);
        lastParsed = parsed;
        lastText = node.script;
        env.$1 = msg;
        for (let i = 0; i < args.length; i++) {
          if (args[i]() !== undefined) {
            const value = args[i]();
            env[`$${i + 2}`] = ArrayBuffer.isView(value) ? value : value;
          }
        }
        const ret = evaluate(parsed, env);
        out[0] = ret as Message;
        out[1] = env as Message;

        pool.borrow(ret);
        let b = new Date().getTime();
        if (b - a > 2) {
          //console.log("lisp took %s ms", b - a, node.script);
        }
        return out as Message[];
      } catch (e) {
        console.log("error", e, node);
        if (e instanceof LispError) {
          console.log((e as LispError).expression);
          node.lispError = e as LispError;
          if (node.onNewValue) {
            node.onNewValue(a);
          }
        }
        // TODO: show error in UI
      }
    }
    return empty;
  };
};

export const lisp = {
  car,
  cdr,
  lisp: lisp_node,
};
