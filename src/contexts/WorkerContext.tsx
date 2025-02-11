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

// Cache for typed array views
class BufferViewCache {
  private float32Views = new WeakMap<SharedArrayBuffer, Float32Array>();
  private uint8Views = new WeakMap<SharedArrayBuffer, Uint8Array>();

  getFloat32View(buffer: SharedArrayBuffer): Float32Array {
    let view = this.float32Views.get(buffer);
    if (!view) {
      view = new Float32Array(buffer);
      this.float32Views.set(buffer, view);
    }
    return view;
  }

  getUint8View(buffer: SharedArrayBuffer): Uint8Array {
    let view = this.uint8Views.get(buffer);
    if (!view) {
      view = new Uint8Array(buffer);
      this.uint8Views.set(buffer, view);
    }
    return view;
  }
}

// Update batcher
class UpdateBatcher {
  private pendingUpdates = new Map<string, Set<any>>();
  private frameRequested = false;
  private bufferCache: BufferViewCache;
  private objects: Record<string, ObjectNode>;
  private messages: Record<string, MessageNode>;

  constructor(objects: Record<string, ObjectNode>, messages: Record<string, MessageNode>) {
    this.objects = objects;
    this.messages = messages;
    this.bufferCache = new BufferViewCache();
  }

  queueUpdate(type: string, updates: any[]) {
    if (!this.pendingUpdates.has(type)) {
      this.pendingUpdates.set(type, new Set());
    }

    for (const update of updates) {
      this.pendingUpdates.get(type)!.add(update);
    }

    if (!this.frameRequested) {
      this.frameRequested = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush() {
    this.frameRequested = false;

    for (const [type, updates] of this.pendingUpdates) {
      const updateArray = Array.from(updates);
      switch (type) {
        case "replaceMessages":
          this.handleReplaceMessages(updateArray);
          break;
        case "mainThreadInstructions":
          this.handleMainThreadInstructions(updateArray);
          break;
        case "onNewValue":
          this.handleOnNewValue(updateArray);
          break;
        case "onNewSharedBuffer":
          this.handleSharedBuffer(updateArray);
          break;
      }
    }

    this.pendingUpdates.clear();
  }

  private handleReplaceMessages(updates: any[]) {
    for (const { messageId, message, sharedBuffer } of updates) {
      const messageNode = this.messages[messageId];
      if (!messageNode?.onNewValue) continue;

      if (message !== undefined) {
        messageNode.message = message;
        messageNode.onNewValue(message);
      } else if (sharedBuffer) {
        const view = this.bufferCache.getFloat32View(sharedBuffer);
        messageNode.message = view;
        messageNode.onNewValue(view);
      }
    }
  }

  private handleMainThreadInstructions(instructions: MainThreadInstruction[]) {
    for (const { nodeId, inletMessages } of instructions) {
      const node = this.objects[nodeId];
      if (!node) continue;

      const { inlets, arguments: args, fn } = node;

      // Process all inlets in one pass
      for (let i = 0; i < inletMessages.length; i++) {
        const message = inletMessages[i];
        if (message === undefined) continue;

        inlets[i].lastMessage = message;
        if (i > 0) {
          args[i - 1] = message;
        }
      }

      if (inletMessages[0] !== undefined && fn) {
        fn(inletMessages[0]);
      }
    }
  }

  private handleOnNewValue(updates: OnNewValue[]) {
    for (const { nodeId, value } of updates) {
      const node = this.objects[nodeId];
      if (!node?.onNewValue) continue;
      node.onNewValue(value);
    }
  }

  private handleSharedBuffer(updates: OnNewSharedBuffer[]) {
    for (const { nodeId, sharedBuffer } of updates) {
      const node = this.objects[nodeId];
      if (!node) continue;

      const isUint8 = node.attributes.type === "uint8" || node.attributes.type === "boolean";
      node.buffer = isUint8
        ? this.bufferCache.getUint8View(sharedBuffer)
        : this.bufferCache.getFloat32View(sharedBuffer);

      if (node.custom) {
        (node.custom as Matrix).buffer = node.buffer;
      }
    }
  }
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
  const batcherRef = useRef<UpdateBatcher>();

  useEffect(() => {
    const worker = new Worker(new URL("../workers/core", import.meta.url));
    workerRef.current = worker;
    batcherRef.current = new UpdateBatcher(objectsRef.current, messagesRef.current);

    worker.onmessage = (event: MessageEvent) => {
      const { type, body } = event.data;
      batcherRef.current?.queueUpdate(type, Array.isArray(body) ? body : [body]);
    };

    worker.postMessage({ type: "init" });

    return () => worker.terminate();
  }, []);

  const sendWorkerMessage = useCallback((body: MessageBody) => {
    workerRef.current?.postMessage(body);
  }, []);

  const registerNodes = useCallback((objects: ObjectNode[], messages: MessageNode[]) => {
    const objMap = objectsRef.current;
    const msgMap = messagesRef.current;

    for (const obj of objects) {
      objMap[obj.id] = obj;
    }
    for (const msg of messages) {
      msgMap[msg.id] = msg;
    }
  }, []);

  useEffect(() => {
    patch.sendWorkerMessage = sendWorkerMessage;
    patch.registerNodes = registerNodes;
  }, [patch, sendWorkerMessage, registerNodes]);

  return <WorkerContext.Provider value={{}}>{children}</WorkerContext.Provider>;
};
