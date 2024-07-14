import { ObjectNode, Message } from "../../types";
import { doc } from "./doc";

doc("fetch", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "fetch url",
});

export const zfetch = (_node: ObjectNode) => {
  return (x: Message) => {
    fetch(x as string).then(async (res) => {
      const json = await res.json();
      _node.send(_node.outlets[0], json);
    });
    return [];
  };
};
