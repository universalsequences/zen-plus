import { OptimizedDataType, Patch, ObjectNode, MessageNode } from "@/lib/nodes/types";
import {
  AttributeUpdate,
  MainThreadInstruction,
  OptimizedMainThreadInstruction,
  UpdateUX,
} from "@/lib/nodes/vm/evaluate";
import {
  MutableValueChanged,
  OnNewSharedBuffer,
  OnNewStepSchema,
  OnNewValue,
  OnNewValues,
  SyncWorkerState,
} from "@/workers/vm/VM";
import { EvaluateNodeBody, MessageBody } from "@/workers/core";
import React, { createContext, useContext, useRef, useCallback, useEffect } from "react";
import { Matrix } from "@/lib/nodes/definitions/core/matrix";
import { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { CompoundOperator, Statement } from "@/lib/nodes/definitions/zen/types";
import { RingBuffer, MessageType, BufferDirection } from "@/lib/workers/RingBuffer";
import { SharedMemoryManager, MemoryOffsets } from "@/lib/workers/SharedMemoryManager";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";

interface IWorkerContext {
  getPerformanceMetrics: () => {
    mainThreadLoad: number;
    workerThreadLoad: number;
    memoryUsageMB: number;
    audioBufferSize: number;
    audioSampleRate: number;
    audioDropoutCount: number;
    activeNodeCount: number;
    messageCount: number;
    instructionCount: number;
  } | null;
}

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
  private pendingRealTimeUpdates = new Map<string, Set<any>>();
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
    if (type !== "mainThreadInstructions") {
      if (!this.pendingUpdates.has(type)) {
        this.pendingUpdates.set(type, new Set());
      }
      for (const update of updates) {
        this.pendingUpdates.get(type)!.add(update);
      }
    }

    switch (type) {
      case "mainThreadInstructions":
        queueMicrotask(() => this.handleMainThreadInstructions(updates));
        break;
      default:
        if (!this.frameRequested) {
          this.frameRequested = true;
          requestAnimationFrame(() => this.flush());
        }
        break;
    }
  }

  private flush(flushType?: string) {
    this.frameRequested = false;

    const pendingUpdates =
      flushType === "mainThreadInstructions" ? this.pendingRealTimeUpdates : this.pendingUpdates;

    for (const [type, updates] of pendingUpdates) {
      const updateArray = Array.from(updates);
      switch (flushType) {
        case "mainThreadInstructions":
          switch (type) {
            case "mainThreadInstructions":
              this.handleMainThreadInstructions(updateArray as MainThreadInstruction[]);
              break;
          }
        default:
          switch (type) {
            case "attributeUpdates":
              this.handleAttributeUpdates(updateArray as AttributeUpdate[]);
              break;
            case "updateUX":
              this.handleUpdateUX(updateArray as UpdateUX[]);
              break;
            case "mutableValueChanged":
              this.handleMutableValueChanged(updateArray as MutableValueChanged[]);
              break;
            case "replaceMessages":
              this.handleReplaceMessages(updateArray);
              break;
            case "mainThreadInstructions":
              this.handleMainThreadInstructions(updateArray as MainThreadInstruction[]);
              break;
            case "optimizedMainThreadInstructions":
              this.handleOptimizedMainThreadInstructions(
                updateArray as OptimizedMainThreadInstruction[],
              );
              break;
            case "onNewValue":
              this.handleOnNewValue(updateArray as OnNewValue[]);
              break;
            case "onNewValues":
              this.handleOnNewValues(updateArray as OnNewValues[]);
              break;
            case "onNewSharedBuffer":
              this.handleSharedBuffer(updateArray as OnNewSharedBuffer[]);
              break;
            case "onNewStepSchema":
              this.handleStepSchema(updateArray as OnNewStepSchema[]);
              break;
          }
          break;
      }
    }

    pendingUpdates.clear();
  }

  handleUpdateUX(update: UpdateUX[]) {
    for (const { nodeId, message } of update) {
      const node = this.objects[nodeId];
      if (node) {
        node.saveData = message;
        node.onNewValue?.(Math.random());
      }
    }
  }

  handleStepSchema(schemas: OnNewStepSchema[]) {
    for (const { nodeId, schema } of schemas) {
      const node = this.objects[nodeId];
      if (node) {
        node.stepsSchema = schema;
      }
    }
  }

  private handleAttributeUpdates(attributeUpdates: AttributeUpdate[]) {
    for (const { nodeId, message } of attributeUpdates) {
      const node = this.objects[nodeId];
      if (node) {
        node.processMessageForAttributes(message);
      }
    }
  }

  private handleMutableValueChanged(mutableValueChanged: MutableValueChanged[]) {
    for (const { nodeId, value } of mutableValueChanged) {
      const node = this.objects[nodeId];
      if (!node?.custom) continue;
      node.custom.value = value;
    }
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

      let inletDetected = -1;
      // Process all inlets in one pass
      for (let i = 0; i < inletMessages.length; i++) {
        const message = inletMessages[i];
        if (message === undefined) continue;
        inletDetected = i;

        inlets[i].lastMessage = message;
        if (i > 0) {
          args[i - 1] = message;
        }
      }

      if (
        inletMessages[0] === undefined &&
        inletDetected > -1 &&
        node.inlets[inletDetected].isHot
      ) {
        inletMessages[0] = node.inlets[0].lastMessage;
      }
      if (inletMessages[0] !== undefined && fn) {
        node.receive(node.inlets[0], inletMessages[0]);
      }
    }
  }

  private handleOptimizedMainThreadInstructions(instructions: OptimizedMainThreadInstruction[]) {
    for (const { nodeId, message } of instructions) {
      const node = this.objects[nodeId];
      if (!node?.fn) continue;

      // For optimized instructions, we only care about inlet[0]
      node.inlets[0].lastMessage = message;
      node.receive(node.inlets[0], message);
    }
  }

  private handleOnNewValue(updates: OnNewValue[]) {
    for (const { nodeId, value } of updates) {
      const node = this.objects[nodeId];
      if (!node?.onNewValue) continue;
      node.onNewValue(value);
    }
  }

  private handleOnNewValues(updates: OnNewValue[]) {
    for (const { nodeId, value } of updates) {
      const node = this.objects[nodeId];
      if (!node?.onNewValues) continue;
      for (const id in node.onNewValues) {
        if (node.name === "zequencer.core" && Array.isArray(value)) {
          node.steps = value[1] as GenericStepData[];
        }
        node.onNewValues[id](value);
      }
    }
  }

  private handleSharedBuffer(updates: OnNewSharedBuffer[]) {
    for (const { nodeId, sharedBuffer } of updates) {
      const node = this.objects[nodeId];
      if (!node) continue;

      const isUint8 =
        (node as ObjectNode).name === "preset" ||
        node.attributes.type === "uint8" ||
        node.attributes.type === "boolean";
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
  const ringBufferRef = useRef<RingBuffer>();
  const sharedMemoryRef = useRef<SharedMemoryManager>();

  // Reference for performance monitoring interval
  const perfMonitorIntervalRef = useRef<number | null>(null);

  // Constants
  const RING_BUFFER_SIZE = 32 * 1024 * 1024; // 32MB buffer size
  const PERF_MONITOR_INTERVAL = 1000; // 1s performance monitoring interval

  useEffect(() => {
    // Create worker first
    const worker = new Worker(new URL("../workers/core", import.meta.url));
    workerRef.current = worker;
    batcherRef.current = new UpdateBatcher(objectsRef.current, messagesRef.current);

    try {
      // Check if SharedArrayBuffer is supported
      if (typeof SharedArrayBuffer === "undefined") {
        throw new Error("SharedArrayBuffer is not supported in this browser");
      }

      // Check if crossOriginIsolated is enabled (required for SharedArrayBuffer in modern browsers)
      if (!self.crossOriginIsolated) {
        console.warn(
          "Cross-origin isolation is not enabled. SharedArrayBuffer requires " +
            "Cross-Origin-Opener-Policy: same-origin and " +
            "Cross-Origin-Embedder-Policy: require-corp headers.",
        );
        // Continue anyway as some environments might still allow it
      }

      // Create a RingBuffer for bidirectional communication
      // Direction is set to MAIN_TO_WORKER for sending from main thread
      console.log(`Initializing ring buffer with size: ${RING_BUFFER_SIZE} bytes`);
      const ringBuffer = new RingBuffer(
        RING_BUFFER_SIZE,
        undefined,
        BufferDirection.MAIN_TO_WORKER,
      );

      // Set up signal callback to notify worker when data is available
      ringBuffer.setSignalCallback(() => {
        worker.postMessage({ type: "ringBufferDataAvailable" });
      });

      ringBufferRef.current = ringBuffer;

      // Create a SharedMemoryManager for direct memory access between threads
      console.log(`Initializing shared memory manager`);
      const sharedMemory = new SharedMemoryManager();
      sharedMemoryRef.current = sharedMemory;

      // Send the SharedArrayBuffer to the worker
      worker.postMessage({
        type: "initRingBuffer",
        buffer: ringBuffer.getBuffer(),
        sharedMemory: sharedMemory.getBuffer(),
      });

      console.log("Successfully initialized shared memory communication");
    } catch (error) {
      console.error("Error initializing shared buffers:", error);
      console.log("Falling back to standard message passing");
      // Initialize without shared buffers
      worker.postMessage({ type: "init" });
    }

    // Function to process data from the ring buffer
    const processRingBufferData = () => {
      const id = Math.random();
      try {
        if (ringBufferRef.current?.canRead()) {
          const message = ringBufferRef.current.read();
          if (message) {
            handleWorkerMessage(message);

            // Continue processing messages if more are available
            // This prevents backlogs by processing all available messages
            if (ringBufferRef.current.canRead()) {
              setTimeout(processRingBufferData, 0); // Use microtask to avoid stack overflow
            }
          }
        } else {
        }
      } catch (error) {
        console.error("Error processing ring buffer data:", error);
      }
    };

    const handleWorkerStateSync = (syncs: SyncWorkerState[]) => {
      console.log("received worker state sync");
      for (const { nodeId, json } of syncs) {
        const node = objectsRef.current[nodeId];
        if (node instanceof ObjectNodeImpl) {
          console.log("actually setting from json here");
          node.custom?.fromJSON(json, true);
        }
      }
      patch.syncingWorkerState = false;
    };

    worker.onmessage = (event: MessageEvent) => {
      const { type, body } = event.data;

      // Handle signal that data is available in the ring buffer
      if (type === "ringBufferDataAvailable") {
        processRingBufferData();
        return;
      }

      if (type === "syncWorkerStateWithMainThread") {
        handleWorkerStateSync(body as SyncWorkerState[]);
      }

      if (event.data.type === "batchedUpdates") {
        const { updates } = event.data;

        if (updates.attributeUpdates) {
          batcherRef.current?.queueUpdate?.("attributeUpdates", updates.attributeUpdates);
        }
        if (updates.replaceMessages) {
          batcherRef.current?.queueUpdate?.("replaceMessages", updates.replaceMessages);
        }
        if (updates.mainThreadInstructions) {
          batcherRef.current?.queueUpdate?.(
            "mainThreadInstructions",
            updates.mainThreadInstructions,
          );
        }
        if (updates.optimizedMainThreadInstructions) {
          batcherRef.current?.queueUpdate?.(
            "optimizedMainThreadInstructions",
            updates.optimizedMainThreadInstructions,
          );
        }
        if (updates.onNewSharedBuffer) {
          batcherRef.current?.queueUpdate?.("onNewSharedBuffer", updates.onNewSharedBuffer);
        }
        if (updates.onNewStepSchema) {
          batcherRef.current?.queueUpdate?.("onNewStepSchema", updates.onNewStepSchema);
        }
        if (updates.onNewValue) {
          batcherRef.current?.queueUpdate?.("onNewValue", updates.onNewValue);
        }
        if (updates.onNewValues) {
          batcherRef.current?.queueUpdate?.("onNewValues", updates.onNewValues);
        }
        if (updates.mutableValueChanged) {
          batcherRef.current?.queueUpdate?.("mutableValueChanged", updates.mutableValueChanged);
        }
      } else if (type === "ringBufferReady") {
        // Worker has acknowledged the ring buffer is ready
        checkInitialMessages();
      } else if (event.data.type === MessageType.UPDATE_UX) {
        batcherRef.current?.queueUpdate("updateUX", [event.data.body]);
      } else {
        batcherRef.current?.queueUpdate(type, Array.isArray(body) ? body : [body]);
      }
    };

    // Check for any existing messages in the buffer
    const checkInitialMessages = () => {
      if (ringBufferRef.current?.canRead()) {
        processRingBufferData();
      }
    };

    // Handle message from worker via ring buffer
    // Optimized for main thread instructions which are performance-critical
    const handleWorkerMessage = (message: { type: MessageType; nodeId: string; message: any }) => {
      // Fast path for main thread instructions which are most time-sensitive
      if (message.type === MessageType.MAIN_THREAD_INSTRUCTION) {
        const instruction = message.message;
        const node = objectsRef.current[instruction.nodeId];

        if (node) {
          // Process instruction immediately to bypass batching for critical instructions
          const { inlets, arguments: args, fn } = node;

          let firstInletMessage = instruction.inletMessages[0];
          let inletDetected = -1;
          // Process all inlets in one pass
          for (let i = 0; i < instruction.inletMessages.length; i++) {
            let inletMessage = instruction.inletMessages[i];
            if (
              inletMessage &&
              typeof inletMessage === "object" &&
              inletMessage["0"] !== undefined
            ) {
              let array = [];
              for (let key in inletMessage) {
                array[parseInt(key)] = inletMessage[key];
              }
              inletMessage = array;
              if (i === 0) {
                firstInletMessage = array;
              }
            }
            if (inletMessage === undefined) continue;
            inletDetected = i;

            inlets[i].lastMessage = inletMessage;
            if (i > 0) {
              args[i - 1] = inletMessage;
            }
          }

          if (
            instruction.inletMessages[0] === undefined &&
            inletDetected > -1 &&
            node.inlets[inletDetected].isHot
          ) {
            instruction.inletMessages[0] = node.inlets[0].lastMessage;
          }

          if (instruction.inletMessages[0] !== undefined && fn) {
            node.receive(node.inlets[0], firstInletMessage);
          }
        }
        return;
      }

      // Handle optimized main thread instructions - even faster path
      if (message.type === MessageType.OPTIMIZED_MAIN_THREAD_INSTRUCTION) {
        const instruction = message.message;
        const node = objectsRef.current[instruction.nodeId];

        if (node && node.fn) {
          // For optimized format we only care about inlet[0]
          const inletMessage = instruction.inletMessages[0];

          // Update inlet with the message
          node.inlets[0].lastMessage = inletMessage;

          // Call the node's receive function directly
          node.receive(node.inlets[0], inletMessage);
        }
        return;
      }

      // For other messages, queue them through the batcher
      switch (message.type) {
        case MessageType.NEW_SHARED_BUFFER:
          batcherRef.current?.queueUpdate("onNewSharedBuffer", [message.message]);
          break;
        case MessageType.NEW_VALUE:
          batcherRef.current?.queueUpdate("onNewValue", [message.message]);
          break;
        case MessageType.REPLACE_MESSAGE:
          batcherRef.current?.queueUpdate("replaceMessages", [message.message]);
          break;
        case MessageType.ATTRIBUTE_UPDATE:
          batcherRef.current?.queueUpdate("attributeUpdates", [message.message]);
          break;
          break;
      }
    };

    worker.postMessage({ type: "init" });

    // Set up performance monitoring
    const startPerformanceMonitoring = () => {
      if (perfMonitorIntervalRef.current === null) {
        perfMonitorIntervalRef.current = window.setInterval(() => {
          if (sharedMemoryRef.current) {
            // Report main thread metrics
            // Calculate main thread CPU utilization (simplified)
            sharedMemoryRef.current.reportCPULoad(false, Math.random() * 20);

            // Update active node count
            sharedMemoryRef.current.updateNodeStats(Object.keys(objectsRef.current).length);
          }
        }, PERF_MONITOR_INTERVAL);
      }
    };

    // Start performance monitoring after worker is ready
    worker.addEventListener("message", function onReady(event) {
      if (event.data.type === "ringBufferReady") {
        startPerformanceMonitoring();
        checkInitialMessages(); // Check for any initial messages
        worker.removeEventListener("message", onReady);
      }
    });

    return () => {
      if (perfMonitorIntervalRef.current !== null) {
        window.clearInterval(perfMonitorIntervalRef.current);
        perfMonitorIntervalRef.current = null;
      }

      // Clear all shared resources
      if (ringBufferRef.current) {
        ringBufferRef.current.clear(true);
      }

      worker.terminate();
    };
  }, []);

  const sendWorkerMessage = useCallback((body: MessageBody, transferables?: Transferable[]) => {
    if (((body as EvaluateNodeBody).body?.message as Statement)?.node) {
      return;
    }

    if (
      body.type === "setCompilation" ||
      body.type === "shareMessagePort" ||
      body.type === "setPresetNodes" ||
      body.type === "setAttributeValue"
    ) {
      if (transferables) {
        workerRef.current?.postMessage(body, transferables);
      } else {
        workerRef.current?.postMessage(body);
      }
      return;
    }

    // Handle optimized publish message
    if (body.type === "publish-optimized") {
      if (ringBufferRef.current && ringBufferRef.current.canWrite()) {
        const success = ringBufferRef.current.write(
          MessageType.PUBLISH_OPTIMIZED,
          "global",
          body.body,
        );
        if (success) {
          return;
        }
      }
      // Fallback to regular publish if optimized fails
      workerRef.current?.postMessage({
        type: "publish",
        body: {
          message: [body.body.subType, body.body.value],
          type: body.body.type,
        },
      });
      return;
    }

    if (body.type === "publish") {
      workerRef.current?.postMessage(body);
      return;
    }

    // Try to use ring buffer first for eligible message types
    if (ringBufferRef.current) {
      let messageType: MessageType | null = null;
      let nodeId = "";
      let messageData = null;

      // Map message body to ring buffer format
      switch (body.type) {
        case "evaluateNode":
          messageType = MessageType.EVALUATE_NODE;
          nodeId = (body as EvaluateNodeBody).body.nodeId;
          messageData = (body as EvaluateNodeBody).body.message;
          break;
        case "updateObject":
          messageType = MessageType.UPDATE_OBJECT;
          nodeId = body.body.nodeId;
          messageData = body.body.json;
          break;
        case "updateMessage":
          messageType = MessageType.UPDATE_MESSAGE;
          nodeId = body.body.nodeId;
          messageData = body.body.json;
          break;
        case "loadbang":
          messageType = MessageType.LOADBANG;
          nodeId = "global";
          break;
        case "attrui":
          messageType = MessageType.ATTRUI;
          nodeId = body.body.nodeId;
          messageData = body.body.message;
          break;
      }

      // If eligible for ring buffer and we can write to it
      if (messageType && ringBufferRef.current.canWrite()) {
        const success = ringBufferRef.current.write(messageType, nodeId, messageData);
        if (success) {
          //console.log("successfully wrote ", messageType, nodeId, messageData);
          // Message was successfully written to the ring buffer
          return;
        }
      } else {
        //console.log("can't write", messageType, body);
      }
    } else {
    }

    // Fallback to postMessage for larger messages or if ring buffer is full
    workerRef.current?.postMessage(body);
  }, []);

  useEffect(() => {
    /*
    setInterval(() => {
      workerRef.current?.postMessage({
        type: "currenttime",
        time: patch?.audioContext?.currentTime,
      });
    }, 10);
    */
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

  const syncWorkerStateWithMainThread = () => {
    patch.syncingWorkerState = true;
    workerRef.current?.postMessage({
      type: "syncWorkerStateWithMainThread",
    });
  };

  useEffect(() => {
    patch.sendWorkerMessage = sendWorkerMessage;
    patch.registerNodes = registerNodes;
    patch.syncWorkerStateWithMainThread = syncWorkerStateWithMainThread;
  }, [patch, sendWorkerMessage, registerNodes]);

  // Function to get current performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (!sharedMemoryRef.current) return null;
    return sharedMemoryRef.current.getPerformanceMetrics();
  }, []);

  return (
    <WorkerContext.Provider value={{ getPerformanceMetrics }}>{children}</WorkerContext.Provider>
  );
};
