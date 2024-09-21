import { Lazy, Message, ObjectNode } from "../../types";
import { parse } from "@/lib/lisp/parse";
import { evaluate } from "@/lib/lisp/eval";
import { doc } from "./doc";
import { Environment } from "@/lib/lisp/types";

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
  numberOfInlets: (x) => x,
  numberOfOutlets: 1,
  description: "script",
});

export const lisp_node = (node: ObjectNode, ...args: Lazy[]) => {
  let env: Environment = {};
  let counter = 0;
  return (msg: Message) => {
    if (msg === "bang") {
      env = {};
      return [];
    }
    // where do we store the script, in a attribute? lol
    //
    if (node.script) {
      // parse it and run...
      try {
        const parsed = parse(node.script);
        env["$1"] = msg;
        for (let i = 0; i < args.length; i++) {
          console.log(args[i]());
          if (args[i]() !== undefined) {
            env[`$${i + 2}`] = args[i]();
          }
        }
        const ret = evaluate(parsed, env);

        if (node.onNewValue) {
          node.onNewValue(counter++);
        }
        return [ret];
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
