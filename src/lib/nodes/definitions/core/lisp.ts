import { Message } from "../../types";
import { doc } from "./doc";

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

export const lisp = {
  car,
  cdr,
};
