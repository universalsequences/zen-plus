import { printLispExpression } from "@/lib/nodes/utils/lisp";
import { Message } from "@/lib/nodes/types";

const MAX_DEPTH = 10;
const safePrint = (x: Message, depth = 0) => {
  if (typeof x === "object") {
    let out = "{ ";
    let i = 0;
    for (const key in x) {
      out += `${key} ${safeStringify((x as Record<string, Message>)[key], depth + 1)}`;
      if (i < Object.keys(x).length - 1) {
        out += " ";
      }
      i++;
    }
    return `${out} }`;
  }
  return "?";
};

export const safeStringify = (message: Message, depth = 0) => {
  if (depth >= MAX_DEPTH) {
    return "...";
  }
  return typeof message === "string" || typeof message === "number"
    ? message.toString()
    : Array.isArray(message)
      ? printLispExpression(message)
      : safePrint(message as Message, depth);
};
