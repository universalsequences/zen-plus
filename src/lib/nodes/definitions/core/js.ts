import type { Message, ObjectNode, Lazy } from "../../types";
import { doc } from "./doc";

var lib: Record<string, any> = {}; // what is the type here?

/**
 * Allow scripting with js
 * */
doc("js", {
  numberOfInlets: (x) => x,
  numberOfOutlets: 1,
  description:
    "evaluates js code, processing messages coming in. each inlet is a variable: $1, $2, $3, etc.",
  outletNames: ["evaluated output"],
  isHot: false,
});
export const js_scripting = (node: ObjectNode, ..._args: Lazy[]) => {
  node.branching = true;
  node.isResizable = true;
  node.hasDynamicInlets = true;
  if (!node.size) {
    node.size = { width: 300, height: 300 };
  }
  if (node.attributes["font-size"] === 9) {
    node.attributes["font-size"] = 11;
  }

  let env: { [x: string]: Message } = {};
  const scriptToRun = node.script as string;
  let func: Function | undefined = undefined;
  try {
    func = new Function("args", "env", "lib", scriptToRun);
  } catch (e) {
    console.log("error=", e);
    func = new Function("args", "env", "lib", "return 0");
  }
  return (msg: Message) => {
    if (!func) {
      return [];
    }
    console.log("msg=", msg);
    if (msg === "clear") {
      for (const key in env) {
        delete env[key];
      }
      return [];
    }
    const args = [msg, ..._args.map((x) => x())];

    // evaluate script here with out and args in scope

    // Evaluate script here with out and args in scope
    try {
      const ret = func(args, env, lib);
      if (ret !== undefined) {
        return [ret];
      }
    } catch (error) {
      console.error("Error in script:", error);
    }

    return [];
  };
};
