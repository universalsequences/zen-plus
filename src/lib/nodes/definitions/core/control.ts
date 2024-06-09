import { ObjectNode, Message, Lazy } from "../../types";
import { doc } from "./doc";

doc("filter.=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message matches condition",
});

export const filter_eq = (node: ObjectNode, condition: Lazy) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data === condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.!=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message does not match condition",
});

export const filter_neq = (node: ObjectNode, condition: Lazy) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data !== condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.i=", {
  isHot: false,
  inletNames: ["message", "arg", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 3,
  description: "passes message if message matches condition",
});
export const filter_arg_eq = (
  _node: ObjectNode,
  arg: Lazy,
  condition: Lazy,
) => {
  return (message: Message) => {
    if (arg() === condition()) {
      if (_node.attributes["debug"]) {
        console.log(message);
      }
      return [message];
    }
    return [];
  };
};

doc("filter.<", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message matches condition",
});

export const filter_lt = (node: ObjectNode, condition: Lazy) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data < condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.<=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message matches condition",
});

export const filter_lte = (node: ObjectNode, condition: Lazy) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data <= condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.>=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message matches condition",
});

export const filter_gte = (node: ObjectNode, condition: Lazy) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data >= condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.%=", {
  isHot: false,
  inletNames: ["message", "divisor", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 3,
  description: "passes message if message matches condition",
});

export const filter_mod_eq = (
  node: ObjectNode,
  divisor: Lazy,
  condition: Lazy,
) => {
  if (!node.attributes["field"]) {
    node.attributes["field"] = "";
  }
  return (message: Message) => {
    let { field } = node.attributes;
    let data = field !== "" ? (message as any)[field as string] : message;
    if (data % (divisor() as number) === condition()) {
      return [message];
    }
    return [];
  };
};

doc("identity", {
  description: "passes message w/o change",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});
export const identity = (_node: ObjectNode) => (x: Message) => [x];
