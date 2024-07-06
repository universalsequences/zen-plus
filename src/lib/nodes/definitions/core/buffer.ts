import { doc } from "./doc";
import { ObjectNode, Message } from "../../types";
import { arrayBufferToArray } from "@/lib/audio/arrayBufferToArray";

doc("buffer", {
  description: "drop a file into it and output typed array",
  numberOfInlets: 1,
  numberOfOutlets: 2,
});

export const buffer = (node: ObjectNode) => {
  if (!node.attributes["data format"]) {
    node.attributes["data format"] = "byte";
  }
  if (!node.attributes["external-URL"]) {
    node.attributes["external-URL"] = "";
  }
  if (!node.attributes.channels) {
    node.attributes.channels = 1;
  }

  node.attributeCallbacks["external-URL"] = (message: string | number | boolean | number[]) => {
    if (lastDownload !== message) {
      node.buffer = undefined;
      node.receive(node.inlets[0], "bang");
    }
  };

  node.attributeOptions = {
    "data format": ["byte", "int32"],
  };

  let lastDownload: string = "";
  return (message: Message): Message[] => {
    // receives an array outputs data with it
    if (node.attributes["external-URL"] !== "") {
      // download
      if (node.buffer) {
        return [node.buffer, node.buffer.length];
      }

      if (lastDownload === message) {
        return [];
      }

      lastDownload = node.attributes["external-URL"] as string;

      fetch(node.attributes["external-URL"] as string).then(async (r) => {
        if (r.status !== 200) {
          return;
        }
        try {
          let arrayBuffer = await r.arrayBuffer();
          let buffer = await arrayBufferToArray(
            arrayBuffer,
            node.patch.audioContext,
            node.attributes["data format"] as string,
            node.attributes.channels,
          );
          node.buffer = buffer;
          node.send(node.outlets[0], buffer);
          node.send(node.outlets[1], buffer.length);
        } catch (e) {}
      });
      return [];
    }
    if (ArrayBuffer.isView(message)) {
      //_size = message.length;
      if (!node.buffer) {
        node.buffer = message;
      }
      return [message as Float32Array, message.length];
    } else if (message === "bang" && node.buffer) {
      //_size = message.length;
      return [node.buffer, node.buffer.length];
    } else {
      return [];
    }
  };
};
