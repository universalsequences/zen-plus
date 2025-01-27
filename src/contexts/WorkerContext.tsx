import { BaseNode } from "@/lib/nodes/BaseNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { Patch, IOlet, Message, ObjectNode, MessageNode } from "@/lib/nodes/types";
import { MessageBody } from "@/workers/core";
import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from "react";

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
      console.log("Worker result:", event.data);
      if (event.data.type === "replaceMessages") {
        for (const { messageId, message } of event.data.body) {
          const messageNode = messagesRef.current[messageId];
          if (messageNode) {
            if (messageNode.onNewValue) {
              messageNode.message = message;
              messageNode.onNewValue(message);
            }
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
