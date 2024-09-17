import { doc } from "./doc";
import { ObjectNode, Lazy, Message } from "../../types";

doc("key.down", {
  numberOfInlets: 2,
  numberOfOutlets: (x) => x,
  inletNames: ["none", "key"],
  description: "outputs bang if key matches",
});

export const keydown = (node: ObjectNode, key: Lazy) => {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return; // Ignore the event if it's from an input field or text box
    }
    const _key = key() === "space" ? " " : key();
    if (e.key === _key) {
      e.preventDefault();
      node.send(node.outlets[0], "bang");
    }
  });

  return (_message: Message) => {
    return [];
  };
};
