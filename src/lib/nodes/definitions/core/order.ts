import { ObjectNode, Message, Lazy } from "../../types";
import { API } from "@/lib/nodes/context";
import { doc } from "./doc";
doc("messagemessage", {
  numberOfOutlets: 2,
  numberOfInlets: 1,
  description: "sends incoming message 1 at a time through outlets",
});

export const messagemessage = (node: ObjectNode) => {
  return (message: Message): Message[] => {
    return [message, message];
  };
};

doc("loadBang", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "sends bang on load",
});

export const loadBang = (node: ObjectNode) => {
  node.needsLoad = true;
  return (message: Message): Message[] => {
    return ["bang"];
  };
};

export const order: API = {
  messagemessage,
  loadBang,
};
