import { BaseNode } from "@/lib/nodes/BaseNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { Patch, IOlet, Message } from "@/lib/nodes/types";
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

  useEffect(() => {
    /*
    // Ensure the worker is only loaded on the client side
    const worker = new Worker(new URL("../workers/core", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      console.log("Worker result:", JSON.parse(event.data));
    };

    worker.postMessage({ type: "init" }); // Send data to the worker
    */
  }, []);

  const registerReceive = useCallback((node: BaseNode, msg: Message, inlet: IOlet) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "receive",
        data: {
          id: node.id,
          message: msg,
          inlet: node.inlets.indexOf(inlet),
        },
      });
    }
  }, []);

  const registerNewNode = useCallback((node: BaseNode) => {
    if (workerRef.current) {
      if (node instanceof ObjectNodeImpl) {
        workerRef.current.postMessage({
          type: "register_new_node",
          data: {
            id: node.id,
            name: node.name,
            inlets: node.inlets.length,
            outlets: node.outlets.length,
          },
        });
      } else if (node instanceof MessageNodeImpl) {
        workerRef.current.postMessage({
          type: "register_new_node",
          data: {
            id: node.id,
            name: "message",
            inlets: node.inlets.length,
            outlets: node.outlets.length,
          },
        });
      }
    }
  }, []);

  const connect = useCallback(
    (fromNode: BaseNode, toNode: BaseNode, inlet: number, outlet: number) => {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "connect",
          data: {
            fromId: fromNode.id,
            toId: toNode.id,
            inlet,
            outlet,
          },
        });
      }
    },
    [],
  );

  useEffect(() => {
    patch.registerNewNode = registerNewNode;
    patch.registerConnect = connect;
    patch.registerReceive = registerReceive;
  }, [patch, registerNewNode, registerReceive, connect]);

  return <WorkerContext.Provider value={{}}>{children}</WorkerContext.Provider>;
};
