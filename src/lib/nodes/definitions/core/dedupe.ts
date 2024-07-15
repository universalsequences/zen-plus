import type { Message } from "../../types";
import { doc } from "./doc";

doc("dedupe", {
  inletNames: ["message"],
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "dedupe messages",
});

export const dedupe = () => {
  let lastMessage: Message | null = null;
  return (message: Message) => {
    if (lastMessage === message) {
      return [];
    }
    lastMessage = message;
    return [message];
  };
};
