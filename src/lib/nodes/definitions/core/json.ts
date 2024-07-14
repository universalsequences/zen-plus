import { ObjectNode, Message, Lazy } from "../../types";
import { NumberOfInlets } from "@/lib/docs/docs";
import { doc } from "./doc";

doc("dict", {
  isHot: false,
  numberOfOutlets: 1,
  numberOfInlets: (x) => x,
  description: "creates a json object out of keys values",
});

export const dict = (_node: ObjectNode, ...args: Lazy[]) => {
  return (_x: Message) => {
    let obj: any = typeof _x === "object" ? { ..._x } : {};

    for (let i = 0; i < args.length - 1; i += 2) {
      let name = args[i]() as string;
      let value = args[i + 1]() as any;
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

export const dict_get = (_node: ObjectNode, ...indices: Lazy[]) => {
  _node.inlets.forEach((x) => (x.hidden = false));
  return (dict: Message) => {
    let ret = indices.map((index) => (dict as any)[index() as string]);
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
    let ret = indices.map((index) => (dict as any)[index() as string]);
    return [ret];
  };
};
