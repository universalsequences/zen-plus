import type { SubPatch, ObjectNode, Message, Lazy, NodeFunction, Patch } from "../../types";
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
  if (!node.attributes.scope) {
    node.attributes.scope = "global";
  }
  node.attributeOptions.scope = ["global", "subtree"];

  return (message: Message) => {
    if (node.attributes.scope === "subtree" && node.instructionNodes) {
      queue.publish(name() as string, message, node.instructionNodes);
    } else {
      queue.publish(name() as string, message);
    }
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
  let lastName = "";
  node.needsLoad = true;
  node.isAsync = true;

  const subcache: { [id: string]: boolean } = {};

  let lastMessage: Message | null = null;
  const onMessage = (...messages: Message[]) => {
    const message = messages[0];
    if (messages[1] && Array.isArray(messages[1])) {
      const nodes = messages[1] as ObjectNode[];
      if (!nodes.includes(node)) {
        return;
      }
    }
    if (lastName !== name()) {
      queue.unsubscribe(lastName, onMessage);
      return;
    }
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

  if (name()) {
    queue.subscribe(name() as string, onMessage);
    lastName = name() as string;
    initialized = true;
  }

  return (_x: Message) => {
    if (lastName !== undefined && name() !== lastName) {
      queue.unsubscribe(lastName, onMessage);
      initialized = false;
      queue.read(name() as string);
    }
    if (!initialized) {
      queue.subscribe(name() as string, onMessage);
      lastName = name() as string;
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
