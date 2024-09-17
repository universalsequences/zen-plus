import type { ObjectNode, Message } from "../../types";
import { doc } from "./doc";

doc("queue", {
  description: "passes messages if queue is empty, until ready is triggered which clears",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});
export const queue = () => {
  const q: Message[] = [];
  const n: Message[] = [];
  return (msg: Message) => {
    if (msg === "ready") {
      if (n.length > 0) {
        const next = n.shift();
        q.shift();
        return [next];
      }
      q.shift();
      return [];
    }
    if (q.length > 0) {
      n.push(msg);
      return [];
    }
    q.push(msg);
    return [msg];
  };
};
