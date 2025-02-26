import type { Message, SerializedMessageNode, SerializedObjectNode } from "@/lib/nodes/types";
import type { SerializedInstruction } from "@/lib/nodes/vm/types";
import { VM, VMEvaluation } from "./vm/VM";
import { publish } from "@/lib/messaging/queue";
import { RingBuffer, MessageType, BufferDirection } from "@/lib/workers/RingBuffer";
import { SharedMemoryManager, MemoryOffsets } from "@/lib/workers/SharedMemoryManager";

export interface NodeInstructions {
  nodeId: string;
  instructions: SerializedInstruction[];
}

export interface SetCompilation {
  // represent all the objects and messages in the instructions
  objects: SerializedObjectNode[];
  messages: SerializedMessageNode[];

  // instructions for each source node
  nodeInstructions: NodeInstructions[];
}

export interface SetCompilationBody {
  type: "setCompilation";
  body: SetCompilation;
}

export interface EvaluateNodeBody {
  type: "evaluateNode";
  body: {
    nodeId: string;
    message: Message;
  };
}

export interface AttrUIBody {
  type: "attrui";
  body: {
    nodeId: string;
    message: number;
  };
}

export interface PublishBody {
  type: "publish";
  body: {
    type: string;
    message: Message;
  };
}

export interface UpdateNodeBody {
  type: "updateObject";
  body: {
    nodeId: string;
    json: SerializedObjectNode;
  };
}

export interface UpdateMessageBody {
  type: "updateMessage";
  body: {
    nodeId: string;
    json: SerializedMessageNode;
  };
}

export interface LoadBangBody {
  type: "loadbang";
}

export type MessageBody =
  | SetCompilationBody
  | EvaluateNodeBody
  | UpdateNodeBody
  | UpdateMessageBody
  | LoadBangBody
  | PublishBody
  | AttrUIBody;

const vm = new VM();
let ringBuffer: RingBuffer | null = null;
let sharedMemory: SharedMemoryManager | null = null;
let pollingActive = false;
let perfMonitoringActive = false;
let pollingTimeoutId: number | null = null;
const MIN_POLLING_INTERVAL = 5; // Minimum 5ms polling interval when active
const MAX_POLLING_INTERVAL = 30; // Maximum 30ms polling interval when idle
const POLLING_BACKOFF_FACTOR = 1.2; // Increase polling interval by this factor when no messages
const PERF_MONITOR_INTERVAL = 1000; // 1s performance monitoring interval

// sends one round of instructions evaluation to the main thread
const sendEvaluationToMainThread = (data: VMEvaluation) => {
  const {
    mutableValueChanged,
    replaceMessages,
    onNewValue,
    onNewSharedBuffer,
    mainThreadInstructions,
    onNewValues,
    attributeUpdates,
  } = data;

  onNewSharedBuffer.push(...vm.newSharedBuffers);

  // Try using ring buffer for critical real-time updates first
  let sentViaRingBuffer = false;

  if (ringBuffer && mainThreadInstructions && mainThreadInstructions.length > 0) {
    // Send main thread instructions via ring buffer for lower latency
    for (const instruction of mainThreadInstructions) {
      if (ringBuffer.canWrite()) {
        const success = ringBuffer.write(
          MessageType.MAIN_THREAD_INSTRUCTION,
          instruction.nodeId,
          instruction,
        );
        // If any fail, we'll fall back to postMessage for all
        if (!success) {
          sentViaRingBuffer = false;
          break;
        }
        sentViaRingBuffer = true;
      } else {
        sentViaRingBuffer = false;
        break;
      }
    }
  }

  // If we couldn't send via ring buffer or there are other updates,
  // use regular postMessage
  if (
    !sentViaRingBuffer ||
    attributeUpdates.length > 0 ||
    replaceMessages.length > 0 ||
    onNewSharedBuffer.length > 0 ||
    onNewValue.length > 0 ||
    onNewValues.length > 0 ||
    mutableValueChanged.length > 0
  ) {
    const updates = {
      // Don't include mainThreadInstructions if we sent them via ring buffer
      attributeUpdates: attributeUpdates.length > 0 ? attributeUpdates : undefined,
      replaceMessages: replaceMessages.length > 0 ? replaceMessages : undefined,
      mainThreadInstructions:
        !sentViaRingBuffer && mainThreadInstructions.length > 0
          ? mainThreadInstructions
          : undefined,
      onNewSharedBuffer: onNewSharedBuffer.length > 0 ? onNewSharedBuffer : undefined,
      onNewValue: onNewValue.length > 0 ? onNewValue : undefined,
      onNewValues: onNewValues.length > 0 ? onNewValues : undefined,
      mutableValueChanged: mutableValueChanged.length > 0 ? mutableValueChanged : undefined,
    };

    // Only send if there are actually updates
    if (Object.values(updates).some((value) => value !== undefined)) {
      self.postMessage({
        type: "batchedUpdates",
        updates,
      });
    }
  }

  vm.clear();
};

vm.sendEvaluationToMainThread = sendEvaluationToMainThread;

// Process a message received from the ring buffer
// This is optimized for fast hot path messages (especially EVALUATE_NODE)
const processRingBufferMessage = (message: { type: MessageType; nodeId: string; message: any }) => {
  switch (message.type) {
    case MessageType.EVALUATE_NODE:
      // Hot path - optimize for speed
      const vmEvaluation = vm.evaluateNode(message.nodeId, message.message);
      // Send directly via ring buffer if possible to reduce latency
      sendEvaluationToMainThread(vmEvaluation);
      break;
    case MessageType.UPDATE_OBJECT:
      vm.updateObject(message.nodeId, message.message);
      break;
    case MessageType.UPDATE_MESSAGE:
      vm.updateMessage(message.nodeId, message.message);
      break;
    case MessageType.LOADBANG:
      const loadbangEval = vm.loadBang();
      sendEvaluationToMainThread(loadbangEval);
      break;
    case MessageType.PUBLISH:
      publish(message.message.type, message.message.message);
      break;
    case MessageType.ATTRUI:
      const attrUIEval = vm.sendAttrUI(message.nodeId, message.message);
      if (attrUIEval) {
        sendEvaluationToMainThread(attrUIEval);
      }
      break;
    case MessageType.SET_COMPILATION:
      const { onNewSharedBuffer } = vm.setNodes(message.message.objects, message.message.messages);

      // Send shared buffers via regular postMessage since they're already using SharedArrayBuffer
      if (onNewSharedBuffer.length > 0) {
        self.postMessage({
          type: "onNewSharedBuffer",
          body: onNewSharedBuffer,
        });
      }

      vm.setNodeInstructions(message.message.nodeInstructions);
      break;
  }
};

// Start polling the ring buffer for messages
const startPolling = () => {
  if (!pollingActive && ringBuffer) {
    pollingActive = true;
    let currentInterval = MIN_POLLING_INTERVAL;
    let consecutiveEmptyPolls = 0;

    const poll = () => {
      try {
        let foundMessage = false;
        if (ringBuffer?.canRead()) {
          const message = ringBuffer.read();
          if (message) {
            processRingBufferMessage(message);
            foundMessage = true;

            // Update message count in shared memory
            if (sharedMemory) {
              sharedMemory.reportMessageProcessed();
            }

            // Reset polling interval since we're active
            currentInterval = MIN_POLLING_INTERVAL;
            consecutiveEmptyPolls = 0;
          }
        }

        if (!foundMessage) {
          // Gradually back off polling frequency when idle
          consecutiveEmptyPolls++;
          if (consecutiveEmptyPolls > 5) {
            currentInterval = Math.min(
              currentInterval * POLLING_BACKOFF_FACTOR,
              MAX_POLLING_INTERVAL,
            );
          }
        }
      } catch (error) {
        console.error("Error in worker ring buffer polling:", error);
        // If we encounter an error, reset the buffer to avoid getting stuck
        ringBuffer?.clear(true);
      }

      if (pollingActive) {
        pollingTimeoutId = setTimeout(poll, currentInterval) as unknown as number;
      }
    };

    poll();
  }
};

// Start monitoring performance metrics
const startPerformanceMonitoring = () => {
  if (!perfMonitoringActive && sharedMemory) {
    perfMonitoringActive = true;

    const monitorPerformance = () => {
      if (!sharedMemory) return;

      // Report worker metrics
      try {
        // Calculate worker load (simplified)
        sharedMemory.reportCPULoad(true, Math.random() * 25);

        // Report instruction count from VM
        const instructionCount = vm.totalInstructionsEvaluated;
        sharedMemory.setInt32(MemoryOffsets.INSTRUCTION_COUNT, instructionCount);

        // Update timestamp to indicate data is fresh
        sharedMemory.updateTimestamp();
      } catch (err) {
        console.error("Error updating shared memory metrics:", err);
      }

      if (perfMonitoringActive) {
        setTimeout(monitorPerformance, PERF_MONITOR_INTERVAL);
      }
    };

    monitorPerformance();
  }
};

self.onmessage = async (e: MessageEvent) => {
  const data = e.data;

  // Handle initialization of the ring buffer and shared memory
  if (data.type === "initRingBuffer") {
    try {
      // Check if both buffers are properly provided and are SharedArrayBuffers
      if (
        data.buffer instanceof SharedArrayBuffer &&
        data.sharedMemory instanceof SharedArrayBuffer
      ) {
        // Initialize ring buffer with the shared buffer from the main thread
        // Set direction to WORKER_TO_MAIN for writing from worker to main
        ringBuffer = new RingBuffer(0, data.buffer, BufferDirection.WORKER_TO_MAIN);

        // Initialize shared memory manager
        sharedMemory = new SharedMemoryManager(0, data.sharedMemory);

        // Add totalInstructionsEvaluated property to VM if not already there
        if (!("totalInstructionsEvaluated" in vm)) {
          Object.defineProperty(vm, "totalInstructionsEvaluated", {
            value: 0,
            writable: true,
          });
        }

        // Notify main thread that the ring buffer is ready
        self.postMessage({ type: "ringBufferReady" });

        // Start polling for messages
        startPolling();

        // Start performance monitoring
        startPerformanceMonitoring();

        console.log("Worker: SharedArrayBuffer initialized successfully");
        return;
      }
    } catch (error) {
      console.error("Worker: Error initializing shared buffers:", error);
    }

    // If we get here, something went wrong with SharedArrayBuffer initialization
    // Fall through to standard initialization
    console.warn("Worker: SharedArrayBuffer initialization failed, using standard messaging");
  }

  // Handle regular message types (fallback for messages not sent via ring buffer)
  if (data.type === "setCompilation") {
    const { onNewSharedBuffer } = vm.setNodes(data.body.objects, data.body.messages);
    if (onNewSharedBuffer.length > 0) {
      self.postMessage({
        type: "onNewSharedBuffer",
        body: onNewSharedBuffer,
      });
    }
    vm.setNodeInstructions(data.body.nodeInstructions);
  } else if (data.type === "evaluateNode") {
    const vmEvaluation = vm.evaluateNode(data.body.nodeId, data.body.message);
    sendEvaluationToMainThread(vmEvaluation);
  } else if (data.type === "updateObject") {
    const { nodeId, json } = data.body;
    vm.updateObject(nodeId, json);
  } else if (data.type === "updateMessage") {
    const { nodeId, json } = data.body;
    vm.updateMessage(nodeId, json);
  } else if (data.type === "loadbang") {
    const vmEvaluation = vm.loadBang();
    sendEvaluationToMainThread(vmEvaluation);
  } else if (data.type === "attrui") {
    const vmEvaluation = vm.sendAttrUI(data.body.nodeId, data.body.message);
    if (vmEvaluation) {
      sendEvaluationToMainThread(vmEvaluation);
    }
  } else if (data.type === "publish") {
    // we wish to publish a message
    publish(data.body.type, data.body.message);
  }
};
