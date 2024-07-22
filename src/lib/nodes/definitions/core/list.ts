import { API } from "../../context";
import type { Lazy, Message, ObjectNode } from "../../types";
import { doc } from "./doc";

doc("unpack", {
  numberOfOutlets: (x) => x - 1,
  numberOfInlets: 1,
  description: "unpacks list into outlets",
});

export const unpack = (node: ObjectNode, ...args: Lazy[]) => {
  return (message: Message): Message[] => {
    if (Array.isArray(message)) {
      return message as Message[];
    }
    return [];
  };
};

doc("pak", {
  numberOfInlets: (x) => x - 1,
  numberOfOutlets: 1,
  description: "packs inlets into a list",
});

export const pak = (node: ObjectNode, ...args: Lazy[]) => {
  return (message: Message): Message[] => {
    if (message === "clear") {
      console.log("clearing all inlets");
      for (const inlet of node.inlets) {
        inlet.lastMessage = undefined;
      }
      return [];
    }
    const list: Message[] = [message];
    for (const a of args) {
      list.push(a() as Message);
    }
    return [list] as Message[];
  };
};

doc("list.length", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "returns length of list",
});

export const list_length = (node: ObjectNode, ...args: Lazy[]) => {
  return (message: Message): Message[] => {
    return [(message as any[]).length] as Message[];
  };
};

doc("list.create", {
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["trigger", "length"],
  description: "returns a new list of given length",
});

export const list_create = (node: ObjectNode, len: Lazy) => {
  return (message: Message): Message[] => {
    return [new Array(len()).fill(0)] as Message[];
  };
};

doc("list.slice", {
  numberOfInlets: 3,
  numberOfOutlets: 1,
  inletNames: ["list", "start", "end"],
  description: "returns a new list of given length",
});

export const list_slice = (node: ObjectNode, start: Lazy, end: Lazy) => {
  return (list: Message): Message[] => {
    if (Array.isArray(list)) {
      return [(list as any[]).slice(start() as number, end() as number)];
    }
    return [];
  };
};

doc("list.set", {
  isHot: false,
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["[index,element]", "list"],
  description: "returns a new list of given length",
});

export const list_set = (node: ObjectNode, list: Lazy) => {
  return (message: Message): Message[] => {
    const [index, msg] = message as [number, Message];
    const _list = list() as Message[];
    _list[index] = msg;
    return [_list as Message];
  };
};

doc("list.nth", {
  isHot: false,
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["nth", "list"],
  description: "returns nth element of list",
});

export const list_nth = (node: ObjectNode, list: Lazy) => {
  return (message: Message) => {
    const nth = message as number;
    const _list = list() as Message[];
    if (Array.isArray(list()) || ArrayBuffer.isView(list())) {
      return [_list[nth] as Message];
    }
    return [];
  };
};

doc("stream", {
  isHot: false,
  numberOfInlets: 2,
  inletNames: ["trigger", "list"],
  outletNames: ["stream element", "flush (on finish)"],
  description:
    "sends the elements of a list one by one out like a stream, sending a flush message out the 2nd inlet on completion",
  numberOfOutlets: 2,
});

export const stream = (node: ObjectNode, list: Lazy) => {
  return (_trig: Message) => {
    if (Array.isArray(list())) {
      for (const element of list() as any[]) {
        node.send(node.outlets[0], element);
      }
      node.send(node.outlets[1], "collect");
    }
    return [];
  };
};

doc("collect", {
  numberOfInlets: 1,
  inletNames: ["element"],
  description: "sends the elements of a list one by one out like a stream",
  numberOfOutlets: 1,
});

export const collect = (node: ObjectNode) => {
  let list: Message[] = [];
  return (_trig: Message) => {
    if (_trig === "collect") {
      const collected = list;
      list = [];
      return [collected];
    }
    list.push(_trig);
    return [];
  };
};

doc("list.max", {
  numberOfInlets: 1,
  inletNames: ["list"],
  description: "returns the max from a list",
  numberOfOutlets: 1,
});

export const list_max = (node: ObjectNode) => {
  if (!node.attributes.field) {
    node.attributes.field = "";
  }
  return (list: Message) => {
    if (!Array.isArray(list)) {
      return [];
    }

    let max = Number.NEGATIVE_INFINITY;
    let maxElement: Message | undefined = undefined;
    for (const element of list) {
      const el =
        node.attributes.field !== ""
          ? (element as any)[node.attributes["field"] as string]
          : element;

      if (el > max) {
        maxElement = element as Message;
        max = el;
      }
    }
    if (maxElement !== undefined) {
      return [maxElement];
    }
    return [];
  };
};

doc("list.join", {
  numberOfInlets: 2,
  inletNames: ["list", "delimeter"],
  description: "joins a list by a delimeter into a string",
  numberOfOutlets: 1,
});

export const list_join = (node: ObjectNode, delimeter: Lazy) => {
  return (message: Message) => {
    if (Array.isArray(message)) {
      return [message.join(delimeter() as string)];
    }
    return [];
  };
};

doc("string.split", {
  defaultValue: " ",
  numberOfInlets: 2,
  inletNames: ["string", "delimeter"],
  description: "splits a string by a delimeter by a string",
  numberOfOutlets: 1,
});

export const string_split = (node: ObjectNode, delimeter: Lazy) => {
  return (message: Message) => {
    if (typeof message === "string") {
      return [message.split(delimeter() as string)];
    }
    return [];
  };
};

doc("parseFloat", {
  numberOfInlets: 1,
  inletNames: ["string"],
  description: "parses string into float",
  numberOfOutlets: 1,
});

export const _parseFloat = (node: ObjectNode) => {
  return (message: Message) => {
    if (typeof message === "string") {
      return [Number.parseFloat(message)];
    }
    return [];
  };
};

doc("list.duplicate", {
  isHot: false,
  numberOfInlets: 2,
  inletNames: ["trigger", "list"],
  description: "doubles the length of a list, duplicating any steps",
  numberOfOutlets: 1,
});

export const list_duplicate = (node: ObjectNode, list: Lazy) => {
  return (trig: Message) => {
    const _list = list() as Message[];
    if (Array.isArray(_list)) {
      const newList = [];
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < _list.length; i++) {
          if (_list[i] !== undefined) {
            newList.push(_list[i]);
          }
        }
      }
      return [newList];
    }
    return [];
  };
};

export const lists: API = {
  collect,
  "string.split": string_split,
  "list.set": list_set,
  "list.join": list_join,
  parseFloat: _parseFloat,
  "list.duplicate": list_duplicate,
  "list.create": list_create,
  "list.length": list_length,
  "list.max": list_max,
  "list.nth": list_nth,
  "list.slice": list_slice,
  stream,
  unpack,
  pak,
};
