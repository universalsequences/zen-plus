import type { ObjectNode, Message, Lazy, NodeFunction } from "../../types";
import { NumberOfInlets } from "@/lib/docs/docs";
import { doc } from "./doc";
import { x } from "@/lib/gl";

doc("dict", {
  isHot: false,
  numberOfOutlets: 1,
  numberOfInlets: (x) => x,
  description: "creates a json object out of keys values",
  isHot: false,
});

export const dict: NodeFunction = (_node: ObjectNode, ...args: Lazy[]) => {
  return (_x: Message) => {
    const obj: Record<string, Message> =
      typeof _x === "object" ? ({ ..._x } as Record<string, Message>) : {};

    for (let i = 0; i < args.length - 1; i += 2) {
      const name = args[i]() as string;
      const value = args[i + 1]() as Message;
      obj[name] = value;
    }
    return [obj];
  };
};

doc("get", {
  inletNames: ["dict", "field"],
  numberOfInlets: NumberOfInlets.Outlets,
  numberOfOutlets: (x) => x,
  description: "access field from diction",
});

export const dict_get: NodeFunction = (_node: ObjectNode, ...indices: Lazy[]) => {
  for (const inlet of _node.inlets) {
    inlet.hidden = false;
  }
  return (dict: Message) => {
    const ret = indices.map((index) => (dict as Record<string, Message>)[index() as string]);
    if (ret.every((x) => x === undefined)) {
      return [];
    }
    return ret;
  };
};

doc("dictpack", {
  inletNames: ["dict", "field"],
  numberOfInlets: (x) => x,
  numberOfOutlets: 1,
  description: "pack a dictionary into a list",
});

export const dictpack = (_node: ObjectNode, ...indices: Lazy[]) => {
  return (dict: Message) => {
    const ret = indices.map((index) => (dict as Record<string, Message>)[index() as string]);
    return [ret];
  };
};
