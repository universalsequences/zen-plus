import type { ObjectNode, Message, Lazy, NodeFunction } from "../../types";
import { doc } from "./doc";

doc("filter.=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 2,
  numberOfInlets: 2,
  description: "passes message if message matches condition",
});

export const filter_eq: NodeFunction = (node: ObjectNode, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data = field !== "" ? (message as Record<string, Message>)[field as string] : message;
    if (data === condition()) {
      return [message, undefined];
    }
    return [undefined, message];
  };
};

doc("filter.!=", {
  isHot: false,
  inletNames: ["message", "condition"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "passes message if message does not match condition",
});

export const filter_neq: NodeFunction = (node: ObjectNode, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data = field !== "" ? (message as Record<string, Message>)[field as string] : message;
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
export const filter_arg_eq: NodeFunction = (_node: ObjectNode, arg: Lazy, condition: Lazy) => {
  node.branching = true;
  return (message: Message) => {
    if (arg() === condition()) {
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

export const filter_lt: NodeFunction = (node: ObjectNode, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data = field !== "" ? (message as Record<string, Message>)[field as string] : message;
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

export const filter_lte: NodeFunction = (node: ObjectNode, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data = field !== "" ? (message as Record<string, Message>)[field as string] : message;
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

export const filter_gte: NodeFunction = (node: ObjectNode, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data = field !== "" ? (message as Record<string, Message>)[field as string] : message;
    if (data >= condition()) {
      return [message];
    }
    return [];
  };
};

doc("filter.%=", {
  isHot: false,
  inletNames: ["message", "divisor", "condition"],
  numberOfOutlets: 2,
  numberOfInlets: 3,
  description: "passes message if message matches condition",
});

export const filter_mod_eq: NodeFunction = (node: ObjectNode, divisor: Lazy, condition: Lazy) => {
  node.branching = true;
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (message: Message) => {
    const { field } = node.attributes;
    const data: Message =
      field !== "" ? (message as Record<string, Message>)[field as string] : message;
    if (typeof data === "number" && data % (divisor() as number) === condition()) {
      return [message];
    }
    return [undefined, message];
  };
};

doc("identity", {
  description: "passes message w/o change",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});
export const identity: NodeFunction = (_node: ObjectNode) => (x: Message) => [x];

doc("==", {
  description: "outputs 1 if equal and 0 if not",
  numberOfInlets: 2,
  numberOfOutlets: 1,
});

export const eq: NodeFunction = (node: ObjectNode, arg: Lazy) => {
  return (message: Message) => {
    if (arg() === message) {
      return [1];
    }
    return [0];
  };
};

doc("<", {
  description: "outputs 1 if < and 0 if not",
  numberOfInlets: 2,
  numberOfOutlets: 1,
});

export const lt: NodeFunction = (node: ObjectNode, arg: Lazy) => {
  return (message: Message) => {
    if (message < arg()) {
      return [1];
    }
    return [0];
  };
};

doc("||", {
  description: "outputs 1 if or and 0 if not",
  numberOfInlets: 2,
  numberOfOutlets: 1,
});

export const or: NodeFunction = (node: ObjectNode, arg: Lazy) => {
  return (message: Message) => {
    return [arg() || message];
  };
};
