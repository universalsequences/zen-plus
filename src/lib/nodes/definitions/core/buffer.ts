import { doc } from "./doc";
import type { ObjectNode, Message, NodeFunction, AttributeValue } from "../../types";
import { arrayBufferToArray } from "@/lib/audio/arrayBufferToArray";

doc("buffer", {
  description: "drop a file into it and output typed array",
  numberOfInlets: 1,
  numberOfOutlets: 3,
  outletNames: ["buffer", "length", "error"],
});

type Cache = {
  [key: string]: [Float32Array, number];
};

const cache: Cache = {};

export const buffer: NodeFunction = (node: ObjectNode) => {
  if (!node.attributes["data format"]) {
    node.attributes["data format"] = "byte";
  }
  if (!node.attributes["external-URL"]) {
    node.attributes["external-URL"] = "";
  }
  if (!node.attributes.channels) {
    node.attributes.channels = 1;
  }

  node.attributeCallbacks["external-URL"] = (message: AttributeValue) => {
    if (lastDownload !== message) {
      node.buffer = undefined;
      node.receive(node.inlets[0], "bang");
    }
  };

  node.attributeOptions = {
    "data format": ["byte", "int32"],
  };

  let lastDownload = "";
  let requests = 0;
  return (message: Message): Message[] => {
    // receives an array outputs data with it
    const url = node.attributes["external-URL"] as string;
    if (url !== "") {
      // download
      if (node.buffer) {
        return [node.buffer, node.buffer.length];
      }

      if (lastDownload === message) {
        return [];
      }

      lastDownload = url;

      if (cache[url]) {
        const [buffer, length] = cache[url];
        node.buffer = buffer;
        node.send(node.outlets[0], buffer);
        node.send(node.outlets[1], length);
        return [];
      }

      const requestId = ++requests;
      setTimeout(() => {
        if (requests !== requestId) {
          return;
        }
        fetch(url)
          .then(async (r) => {
            if (r.status !== 200) {
              node.send(node.outlets[2], "bang");
              return;
            }
            if (requests !== requestId) {
              return;
            }
            try {
              const arrayBuffer = await r.arrayBuffer();
              console.log("tryna do arraybuffertoarray...");
              const [buffer, length] = await arrayBufferToArray(
                arrayBuffer,
                node.patch.audioContext,
                node.attributes["data format"] as string,
                node.attributes.channels as number,
              );
              console.log("arraybuffer to array returned");
              console.log("BUFFER/LENGTH", buffer, length);
              cache[url] = [buffer, length];
              node.buffer = buffer;
              node.send(node.outlets[0], buffer);
              node.send(node.outlets[1], length);
            } catch (e) {}
          })
          .catch((e) => {
            console.log("ERROR?", e);
            node.send(node.outlets[2], "bang");
          });
      }, 150);
      return [];
    }
    if (ArrayBuffer.isView(message)) {
      if (!node.buffer) {
        node.buffer = message;
      }
      return [message as Float32Array, message.length];
    }

    if (message === "bang" && node.buffer) {
      return [node.buffer, node.buffer.length];
    }
    return [];
  };
};
