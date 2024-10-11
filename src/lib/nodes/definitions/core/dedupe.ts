import type { Message, NodeFunction } from "../../types";
import { doc } from "./doc";

doc("dedupe", {
  inletNames: ["message"],
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "dedupe messages",
});

export const dedupe: NodeFunction = () => {
  let lastMessage: Message | null = null;
  return (message: Message) => {
    if (lastMessage === message) {
      return [];
    }
    lastMessage = message;
    return [message];
  };
};
