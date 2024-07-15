import { ObjectNode, Message } from "../../types";
import { doc } from "./doc";

doc("fetch", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "fetch url",
});

export const zfetch = (_node: ObjectNode) => {
  let counter = 0;
  return (x: Message) => {
    let id = ++counter;
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
