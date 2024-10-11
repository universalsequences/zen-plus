import type { Message, ObjectNode } from "../../types";
import { doc } from "./doc";

doc("print", {
  inletNames: ["message to print"],
  numberOfInlets: 1,
  numberOfOutlets: 0,
  description: "print message to console",
});

export const print = (_node: ObjectNode) => {
  return (message: Message) => {
    console.log(message);
    return [];
  };
};
