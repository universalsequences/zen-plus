import type { ObjectNode, Message, NodeFunction } from "../../types";
import { doc } from "./doc";

doc("fetch", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "fetch url",
});

export const zfetch: NodeFunction = (_node: ObjectNode) => {
  let counter = 0;
  return (x: Message) => {
    const id = ++counter;
    // debouncing
    setTimeout(() => {
      if (id !== counter) return;
      fetch(x as string).then(async (res) => {
        const json = await res.json();
        _node.send(_node.outlets[0], json);
      });
    }, 30);
    return [];
  };
};
