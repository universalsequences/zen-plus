import { doc } from "./doc";
import { NumberOfInlets } from "@/lib/docs/docs";
import { ObjectNode, Lazy, Message } from "../../types";

doc("select", {
  aliases: ["sel"],
  numberOfInlets: NumberOfInlets.Outlets,
  numberOfOutlets: (x) => x,
  inletNames: ["type", "type", "type"],
  description: "selectively outputs inputs based",
});

export const select = (node: ObjectNode, ...types: Lazy[]) => {
  node.branching = true;
  let outputs = new Array(types.length + 1).fill(undefined);
  return (message: Message) => {
    let matched = false;
    const bang = "bang";
    for (let i = 0; i < outputs.length - 1; i++) {
      if (message === types[i]()) {
        outputs[i] = bang;
        matched = true;
      } else {
        outputs[i] = undefined;
      }
    }
    if (!matched) {
      outputs[outputs.length - 1] = bang;
    }
    return outputs;
  };
};

doc("route", {
  numberOfInlets: NumberOfInlets.Outlets,
  numberOfOutlets: (x) => x,
  inletNames: ["type", "type", "type"],
  description: "selectively routes inputs based on cond",
});

export const route = (node: ObjectNode, ...types: Lazy[]) => {
  let outputs: Message[] = new Array(types.length + 1).fill(undefined);
  if (!node.attributes["field"]) {
    node.attributes["field"] = "type";
  }

  node.branching = true;

  return (message: Message) => {
    let matched = false;
    if (typeof message === "string" && message.includes(" ")) {
      message = message.split(" ");
    }
    for (let i = 0; i < outputs.length - 1; i++) {
      if ((message as any)[node.attributes["field"] as string] === types[i]()) {
        outputs[i] = message as Message;
        matched = true;
      } else if (Array.isArray(message) && message[0] === types[i]()) {
        outputs[i] = message[1] as Message;
        matched = true;
      } else if (message === types[i]()) {
        outputs[i] = message;
        matched = true;
      } else {
        outputs[i] = undefined as unknown as Message;
      }
    }
    if (Array.isArray(message)) {
      message = message[1] as Message;
    }
    if (!matched) {
      outputs[outputs.length - 1] = message;
    } else {
      (outputs as any[])[outputs.length - 1] = undefined;
    }
    return outputs;
  };
};

doc("filterselect", {
  numberOfInlets: (x) => x,
  numberOfOutlets: 1,
  inletNames: ["control", "msg", "msg", "msg"],
  description: "selectively routes inputs based on cond",
});

export const filterselect = (node: ObjectNode, ...messages: Lazy[]) => {
  node.branching = true;

  let cache: Message[] = [];

  return (index: Message) => {
    if (typeof index === "number") {
      if (messages[index] && messages[index]()) {
        const result = messages[index]();
        if (result !== cache[index]) {
          cache[index] = result;
          return [messages[index]()];
        }
      }
    }
    return [];
  };
};

doc("messagefilter", {
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["msg", "control"],
  description: "filters messages based on control",
  isHot: false,
});

export const messagefilter = (node: ObjectNode, control: Lazy) => {
  node.branching = true;

  return (msg: Message) => {
    if (control()) {
      return [msg];
    }
    return [];
  };
};

doc("gate", {
  numberOfOutlets: "channels",
  numberOfInlets: 2,
  inletNames: ["msg", "control"],
  description: "routes outputs based on control input",
  isHot: false,
});

export const gate = (node: ObjectNode, control: Lazy) => {
  node.branching = true;

  return (msg: Message) => {
    const arr = new Array(node.outlets.length).fill(undefined);
    arr[(control() as number) - 1] = msg;
    return arr;
  };
};
