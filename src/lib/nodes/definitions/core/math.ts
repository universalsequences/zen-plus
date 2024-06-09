import { ObjectNode, Message, Lazy } from "../../types";
import { API } from "@/lib/nodes/context";
import { doc } from "./doc";

doc("+", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "adds two messages together",
});

export const add = (node: ObjectNode, a: Lazy) => {
  return (message: Message): Message[] => {
    return [(message as number) + (a() as number)];
  };
};

doc("-", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "subtracks two messages together",
});

export const sub = (node: ObjectNode, a: Lazy) => {
  return (message: Message): Message[] => {
    return [(message as number) - (a() as number)];
  };
};

doc("*", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "multiplies two messages together",
});

export const mult = (node: ObjectNode, a: Lazy) => {
  return (message: Message): Message[] => {
    let _a = a();
    if (Array.isArray(message)) {
      return [
        message.map((val, i) =>
          Array.isArray(_a)
            ? (val as number) * (_a[i] as number)
            : (val as number) * (_a as number),
        ),
      ];
    }
    return [(message as number) * (a() as number)];
  };
};

doc("/", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "divides two messages together",
});

export const div = (node: ObjectNode, a: Lazy) => {
  return (message: Message): Message[] => {
    return [(message as number) / (a() as number)];
  };
};

doc("%", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "mods two messages together",
});

export const mod = (node: ObjectNode, a: Lazy) => {
  return (message: Message): Message[] => {
    return [(message as number) % (a() as number)];
  };
};

doc("ceil", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "calculates the ceiling of a number",
});

export const ceil = (node: ObjectNode) => {
  return (message: Message): Message[] => {
    return [Math.ceil(message as number)];
  };
};

doc("floor", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "applies a floor to number message",
});

export const floor = (node: ObjectNode) => {
  return (message: Message): Message[] => {
    return [Math.floor(message as number)];
  };
};

doc("sqrt", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "applies square-root to a number message",
});

export const sqrt = (node: ObjectNode) => {
  return (message: Message): Message[] => {
    return [Math.sqrt(message as number)];
  };
};

doc("random", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "generates a random number from 0-1",
});

export const random = (node: ObjectNode) => {
  return (message: Message): Message[] => {
    return [Math.random()];
  };
};

export const math: API = {
  "+": add,
  "-": sub,
  "*": mult,
  "/": div,
  "%": mod,
  random: random,
  sqrt,
  floor,
  ceil,
};
