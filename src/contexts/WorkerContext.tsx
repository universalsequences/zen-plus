import { Patch, ObjectNode, MessageNode } from "@/lib/nodes/types";
import { MainThreadInstruction } from "@/lib/nodes/vm/evaluate";
import { OnNewSharedBuffer, OnNewValue } from "@/workers/vm/VM";
import { MessageBody } from "@/workers/core";
import React, { createContext, useContext, useRef, useCallback, useEffect } from "react";
import { Matrix } from "@/lib/nodes/definitions/core/matrix";

interface IWorkerContext {}

interface Props {
  patch: Patch;
  children: React.ReactNode;
}

const WorkerContext = createContext<IWorkerContext | undefined>(undefined);

export const useWorker = (): IWorkerContext => {
  const context = useContext(WorkerContext);
  if (!context) throw new Error("useWorkerHandler must be used within LockedProvider");
  return context;
};

export const WorkerProvider: React.FC<Props> = ({ patch, children }) => {
  const workerRef = useRef<Worker>();

  const objectsRef = useRef<{ [x: string]: ObjectNode }>({});
  const messagesRef = useRef<{ [x: string]: MessageNode }>({});

  useEffect(() => {
    // Ensure the worker is only loaded on the client side
    const worker = new Worker(new URL("../workers/core", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "replaceMessages") {
        for (const { messageId, message, sharedBuffer } of event.data.body) {
          const messageNode = messagesRef.current[messageId];
          if (messageNode) {
            if (messageNode.onNewValue) {
              if (message !== undefined) {
                messageNode.message = message;
                messageNode.onNewValue(message);
              } else if (sharedBuffer) {
                const buffer = sharedBuffer as SharedArrayBuffer;
                const floatBuffer = new Float32Array(buffer);
                messageNode.message = floatBuffer;
                messageNode.onNewValue(floatBuffer);
              }
            }
          }
        }
      } else if (event.data.type === "mainThreadInstructions") {
        const mainThreadInstructions = event.data.body as MainThreadInstruction[];
        for (const { nodeId, inletMessages } of mainThreadInstructions) {
          const node = objectsRef.current[nodeId];
          if (!node) continue;
          for (let i = 0; i < inletMessages.length; i++) {
            const message = inletMessages[i];
            if (message !== undefined) {
              node.inlets[i].lastMessage = message;
              if (i > 0) {
                node.arguments[i - 1] = message;
              }
            }
          }
          if (inletMessages[0] !== undefined) {
            // evaluate
            node.fn?.(inletMessages[0]);
          }
        }
      } else if (event.data.type === "onNewValue") {
        const onNewValues = event.data.body as OnNewValue[];
        for (const { nodeId, value } of onNewValues) {
          const node = objectsRef.current[nodeId];
          if (!node) continue;
          node.onNewValue?.(value);
        }
      } else if (event.data.type === "onNewSharedBuffer") {
        const onNewSharedBuffer = event.data.body as OnNewSharedBuffer[];
        for (const { nodeId, sharedBuffer } of onNewSharedBuffer) {
          const node = objectsRef.current[nodeId];
          if (!node) continue;
          node.buffer =
            node.attributes.type === "uint8" || node.attributes.type === "boolean"
              ? new Uint8Array(sharedBuffer)
              : new Float32Array(sharedBuffer);
          if (node.attributes.type === "uint8" || node.attributes.type === "boolean") {
            console.log("creating uint8 buffer", node.buffer, node);
          } else {
          }
          console.log("setting buffer of type=", node.attributes.type, node.buffer, sharedBuffer);
          if (node.custom) {
            (node.custom as Matrix).buffer = node.buffer;
          }
        }
      }
    };

    worker.postMessage({ type: "init" }); // Send data to the worker
  }, []);

  const sendWorkerMessage = useCallback((body: MessageBody) => {
    if (workerRef.current) {
      workerRef.current.postMessage(body);
    }
  }, []);

  const registerNodes = useCallback((objects: ObjectNode[], messages: MessageNode[]) => {
    for (const o of objects) {
      objectsRef.current[o.id] = o;
    }
    for (const m of messages) {
      messagesRef.current[m.id] = m;
    }
  }, []);

  useEffect(() => {
    patch.sendWorkerMessage = sendWorkerMessage;
    patch.registerNodes = registerNodes;
  }, [patch, sendWorkerMessage]);

  return <WorkerContext.Provider value={{}}>{children}</WorkerContext.Provider>;
};
