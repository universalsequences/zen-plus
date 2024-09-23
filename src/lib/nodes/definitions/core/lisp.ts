import { Lazy, Message, ObjectNode } from "../../types";
import { parse } from "@/lib/lisp/parse";
import { evaluate } from "@/lib/lisp/eval";
import { doc } from "./doc";
import { AST, Environment } from "@/lib/lisp/types";

doc("car", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "returns first element of list",
});

export const car = () => {
  return (message: Message) => {
    if (Array.isArray(message)) {
      return [message[0]];
    }
    return [];
  };
};

doc("cdr", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "returns rest of list",
});

export const cdr = () => {
  return (message: Message) => {
    if (Array.isArray(message)) {
      return [message.slice(1)];
    }
    return [];
  };
};

doc("lisp", {
  numberOfInlets: (x) => x + 1,
  numberOfOutlets: 2,
  description: "script",
  outletNames: ["evaluated output", "scope"],
  isHot: false,
});

export const lisp_node = (node: ObjectNode, ...args: Lazy[]) => {
  let env: Environment = {};
  let lastEnv: Environment = {};
  let counter = 0;
  let lastText: string | undefined = undefined;
  let lastParsed: AST;
  node.inlets[node.inlets.length - 1].lastMessage = env as Message;

  const getEnvFromMessages = () => {
    return args[args.length - 1]() as Environment;
  };

  return (msg: Message) => {
    if (msg === "clear") {
      lastEnv = getEnvFromMessages();
      env = { ...lastEnv };
      return [];
    }

    const _env = getEnvFromMessages();
    if (_env !== lastEnv) {
      lastEnv = _env;
      env = { ... env, ..._env };
    }

    // where do we store the script, in a attribute? lol
    //
    if (node.script) {
      // parse it and run...
      try {
        const parsed = node.script === lastText ? lastParsed : parse(node.script);
        lastParsed = parsed;
        lastText = node.script;
        env["$1"] = msg;
        for (let i = 0; i < args.length; i++) {
          if (args[i]() !== undefined) {
            const value = args[i]();
            env[`$${i + 2}`] = ArrayBuffer.isView(value) ? Array.from(value) : value;
          }
        }
        const ret = evaluate(parsed, env);

        if (node.onNewValue) {
          node.onNewValue(counter++);
        }
        return [ret, env];
      } catch (e) {
        console.log("error", e);
        return [];
      }
    }
  };
};

export const lisp = {
  car,
  cdr,
  lisp: lisp_node,
};
