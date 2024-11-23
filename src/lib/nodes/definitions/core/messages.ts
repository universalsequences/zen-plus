import type { SubPatch, ObjectNode, Message, Lazy, NodeFunction } from "../../types";
import { OperatorContextType } from "@/lib/nodes/context";
import * as queue from "@/lib/messaging/queue";
import { doc } from "./doc";

doc("send", {
  aliases: ["s"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  inletNames: ["message to send", "message name"],
  description: "comment your patch with this node",
});

export const send = (node: ObjectNode, name: Lazy) => {
  return (message: Message) => {
    queue.publish(name() as string, message);
    return [];
  };
};

doc("subscribe", {
  aliases: ["receive", "r"],
  numberOfOutlets: 1,
  numberOfInlets: 2,
  description: "comment your patch with this node",
});

export const subscribe = (node: ObjectNode, name: Lazy) => {
  let initialized = false;
  const lastName = "";
  node.needsLoad = true;

  let lastMessage: Message | null = null;
  const onMessage = (message: Message) => {
    // received the message
    const patchType = node.patch ? (node.patch as SubPatch).patchType : undefined;
    if (Array.isArray(message) && patchType === OperatorContextType.ZEN) {
      // we are in a zen patch so only subscribe to messages
      // from "this zen audio graph"
      const messagePatch = message[2];
      let zenBase = node.patch;
      while (!zenBase.isZenBase()) {
        zenBase = (zenBase as SubPatch).parentPatch;
      }
      if (zenBase !== messagePatch) {
        return;
      }
    }
    if (lastMessage === message && message !== "bang") {
      return;
    }
    const second = (message as Message[])[2];
    if (second && ((message as Message[])[2] as unknown as SubPatch).patchType !== undefined) {
      (message as Message[]).splice(2, 1);
    }
    node.send(node.outlets[0], message);
    if (typeof message === "string") {
      lastMessage = message;
    }
  };

  return (x: Message) => {
    if (lastName && name() !== lastName) {
      queue.unsubscribe(lastName, onMessage);
      initialized = false;
      const ret = queue.read(name() as string);
    }
    if (!initialized) {
      queue.subscribe(name() as string, onMessage);
      initialized = true;
    }
    const ret = queue.read(name() as string);
    if (ret?.[0]) {
      return [ret[0]];
    }
    return [];
  };
};

doc("patchmessage", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "sends message out of this patch's outlet",
});
export const patchmessage: NodeFunction = (node: ObjectNode) => {
  return (message: Message) => {
    // just pipe it out of this node's patch'
    const patch = node.patch as SubPatch;
    const n = patch.parentNode;
    n?.send(n?.outlets[0], message);
    return [];
  };
};
