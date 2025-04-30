import { MockPatch } from "../../../test/mocks/MockPatch";
import {
  type Message,
  type SerializedMessageNode,
  type SerializedObjectNode,
  type Node,
  type Patch,
  type ObjectNode,
  type MessageNode,
  MessageType,
  AttributeValue,
} from "@/lib/nodes/types";
import { MockObjectNode } from "../../../test/mocks/MockObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import {
  type Instruction,
  InstructionType,
  type SerializedInstruction,
} from "@/lib/nodes/vm/types";
import type { NodeInstructions } from "../core";
import {
  AttributeUpdate,
  MainThreadInstruction,
  OptimizedMainThreadInstruction,
  ReplaceMessage,
  evaluate,
} from "@/lib/nodes/vm/evaluate";
import { isMessageNode } from "@/lib/nodes/vm/instructions";
import { PresetManager } from "@/lib/nodes/definitions/core/preset";
import { publish } from "@/lib/messaging/queue";
import { StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";

export interface OnNewValue {
  nodeId: string;
  value: Message;
}

export interface OnNewStepSchema {
  nodeId: string;
  schema: StepDataSchema;
}

export interface OnNewValues {
  nodeId: string;
  value: Message;
}

export interface OnNewSharedBuffer {
  nodeId: string;
  sharedBuffer: SharedArrayBuffer;
}

export interface VMEvaluation {
  instructionsEvaluated: Instruction[];
  replaceMessages: ReplaceMessage[];
  objectsEvaluated?: ObjectNode[];
  mainThreadInstructions: MainThreadInstruction[];
  optimizedMainThreadInstructions: OptimizedMainThreadInstruction[];
  onNewValue: OnNewValue[];
  onNewSharedBuffer: OnNewSharedBuffer[];
  mutableValueChanged: MutableValueChanged[];
  onNewValues: OnNewValues[];
  attributeUpdates: AttributeUpdate[];
  onNewStepSchema: OnNewStepSchema[];
}

export interface MutableValueChanged {
  nodeId: string;
  value: Message;
}

export interface SyncWorkerState {
  nodeId: string;
  json: any; // TODO: custom needs strong typing for getJSON
}

export class VM {
  nodes: {
    [id: string]: Node;
  };
  patch: Patch;
  nodeInstructions: {
    [nodeId: string]: Instruction[];
  };
  onNewValue: OnNewValue[] = [];
  onNewValues: OnNewValues[] = [];
  onNewStepSchema: OnNewStepSchema[] = [];
  newSharedBuffers: OnNewSharedBuffer[] = [];
  mutableValueChanged: MutableValueChanged[] = [];

  // Performance tracking
  totalInstructionsEvaluated: number = 0;

  sendEvaluationToMainThread?: (evaluation: VMEvaluation) => void;

  sendWorkerStateToMainThread?: (payload: SyncWorkerState[]) => void;

  updateUX?: (nodeId: string, message: Message) => void;
  currenttime = 0;

  constructor() {
    this.nodes = {};
    this.patch = new MockPatch(undefined);
    this.patch.vm = this;
    this.nodeInstructions = {};
    this.onNewValue = [];
  }

  initializeObjectNode(o: SerializedObjectNode) {
    const p = this.patch;
    let o1 = (this.nodes[o.id] as ObjectNode) || new MockObjectNode(p);
    o1.onNewValue = (value) => this.onNewValue.push({ nodeId: o1.id, value: value });
    o1.onNewValues = {
      1: (value) => this.onNewValues.push({ nodeId: o1.id, value: value }),
    };
    o1.onNewSharedBuffer = (value) => {
      this.newSharedBuffers.push({ nodeId: o1.id, sharedBuffer: value });
    };
    o1.onNewStepSchema = (schema) => {
      this.onNewStepSchema.push({ nodeId: o1.id, schema });
    };
    o1.fromJSON(o);
    this.nodes[o1.id] = o1;
  }

  syncWorkerStateWithMainThread() {
    // need to fetch all nodes with a "custom" -> getJSON() and send over in one large payload
    let payload: SyncWorkerState[] = [];
    for (const id in this.nodes) {
      const node = this.nodes[id];
      if (node instanceof MockObjectNode) {
        if (node.custom) {
          const json = node.custom.getJSON();
          payload.push({
            nodeId: id,
            json,
          });
        }
      }
    }

    this.sendWorkerStateToMainThread?.(payload);
  }

  setNodes(objects: SerializedObjectNode[], messages: SerializedMessageNode[]) {
    const p = this.patch;
    for (const o of objects) {
      if (this.nodes[o.id]) continue; // skip if it already exists (note: should we actually skip?)
      this.initializeObjectNode(o);
    }
    for (const m of messages) {
      let m1 = (this.nodes[m.id] as MessageNode) || new MessageNodeImpl(p, m.messageType);
      m1.fromJSON(m);
      this.nodes[m1.id] = m1;
    }

    return {
      onNewSharedBuffer: this.newSharedBuffers,
    };
  }

  setAttributeValue(nodeId: string, key: string, value: AttributeValue) {
    const node = this.nodes[nodeId];
    if (!node) return;
    node.setAttribute(key, value);
  }

  setPresetNodes(nodeId: string, nodeIds: string[]) {
    const node = this.nodes[nodeId];
    if (node) {
      const presetManager = (node as ObjectNode).custom;
      if (presetManager instanceof PresetManager) {
        presetManager.presetNodes = new Set(nodeIds);
        const allNodes: Node[] = [];
        for (const id of nodeIds) {
          const _node = this.nodes[id];
          if (_node) {
            allNodes.push(_node);
          }
        }
        presetManager.hydrateSerializedPresets(allNodes);
      }
    }
  }

  // TODO - call this whenever an object updates from main thread
  updateObject(nodeId: string, serializedNode: SerializedObjectNode) {
    const node = this.nodes[nodeId] as ObjectNode;
    if (node) {
      const args = [...node.arguments];
      node.fromJSON(serializedNode);
      if (node.text.split(" ").length === 1 || node.name === "lisp" || node.name === "js") {
        // if node text itself has args
        for (let i = 0; i < args.length; i++) {
          if (i + 1 < node.inlets.length) {
            node.arguments[i] = args[i];
            node.inlets[i + 1].lastMessage = args[i];
          }
        }
      }
    } else {
      this.initializeObjectNode(serializedNode);
    }
  }

  updateMessage(nodeId: string, serializedNode: SerializedMessageNode) {
    if (this.nodes[nodeId]) {
      (this.nodes[nodeId] as MessageNode).fromJSON(serializedNode);
    }
  }

  setNodeInstructions(nodeInstructions: NodeInstructions[]) {
    for (const { nodeId, instructions } of nodeInstructions) {
      const deserializedInstructions: Instruction[] = [];
      for (const instruction of instructions) {
        deserializedInstructions.push(deserializeInstruction(instruction, this.nodes));
      }
      this.nodeInstructions[nodeId] = deserializedInstructions;
      const node = this.nodes[nodeId] as ObjectNode;
      if (node && node.isAsync) {
        node.instructions = deserializedInstructions;
      }
    }
  }

  evaluateNode(nodeId: string, message: Message): VMEvaluation | null {
    if ((this.nodes[nodeId] as MessageNode)?.messageType === MessageType.Number) {
      publish("statechanged", {
        node: this.nodes[nodeId],
        state: message,
      });
    }
    const instructions = this.nodeInstructions[nodeId];
    if (!instructions) {
      return null;
    }

    // Evaluate instructions
    const evaluation = evaluate(instructions, message);

    // Update performance metrics
    this.totalInstructionsEvaluated += evaluation.instructionsEvaluated.length;

    const vmEvaluation: VMEvaluation = {
      ...evaluation,
      onNewValue: this.onNewValue,
      onNewValues: this.onNewValues,
      onNewSharedBuffer: this.newSharedBuffers,
      mutableValueChanged: this.mutableValueChanged,
      onNewStepSchema: this.onNewStepSchema,
    };

    return vmEvaluation;
  }

  clear() {
    this.onNewValue.length = 0;
    this.onNewValues.length = 0;
    this.newSharedBuffers.length = 0;
    this.mutableValueChanged.length = 0;
    this.onNewStepSchema.length = 0;
  }

  alreadyLoaded: { [x: string]: boolean } = {};

  /**
   * executes all load bangs / numbers - to be called after initial compile of project
   * */
  loadBang() {
    const vmEvaluation: VMEvaluation = {
      instructionsEvaluated: [],
      optimizedMainThreadInstructions: [],
      replaceMessages: [],
      objectsEvaluated: [],
      mainThreadInstructions: [],
      onNewValue: [],
      onNewSharedBuffer: [],
      mutableValueChanged: [],
      onNewValues: [],
      attributeUpdates: [],
      onNewStepSchema: [],
    };

    for (const nodeId in this.nodeInstructions) {
      const node = this.nodes[nodeId];
      if (!node || this.alreadyLoaded[nodeId]) {
        continue;
      }
      if (isMessageNode(node)) {
        continue;
      }

      if ((node as ObjectNode).name === "subscribe" || (node as ObjectNode).name === "r") {
        //continue;
      }
      this.alreadyLoaded[nodeId] = true;
      if ((node as ObjectNode).needsLoad) {
        if ((node as ObjectNode).isAsync) {
          node.receive(node.inlets[0], "bang");
          continue;
        }
        const ret = this.evaluateNode(nodeId, "bang");
        if (!ret) {
          return;
        }
        vmEvaluation.instructionsEvaluated.push(...ret.instructionsEvaluated);
        vmEvaluation.replaceMessages.push(...ret.replaceMessages);
        vmEvaluation.objectsEvaluated?.push(...(ret.objectsEvaluated || []));
        vmEvaluation.mainThreadInstructions.push(...ret.mainThreadInstructions);
        vmEvaluation.optimizedMainThreadInstructions.push(...ret.optimizedMainThreadInstructions);
        vmEvaluation.onNewValue.push(...ret.onNewValue);
        vmEvaluation.onNewSharedBuffer.push(...ret.onNewSharedBuffer);
        vmEvaluation.mutableValueChanged.push(...ret.mutableValueChanged);
        vmEvaluation.onNewValues.push(...ret.onNewValues);
        vmEvaluation.attributeUpdates.push(...ret.attributeUpdates);
        vmEvaluation.onNewStepSchema.push(...ret.onNewStepSchema);
      }
    }

    for (const nodeId in this.nodeInstructions) {
      const node = this.nodes[nodeId];
      if (!node || this.alreadyLoaded[nodeId]) {
        continue;
      }
      if (!isMessageNode(node)) {
        continue;
      }
      this.alreadyLoaded[nodeId] = true;
      if ((node as MessageNode).messageType === MessageType.Number) {
        this.evaluateNode(nodeId, (node as MessageNode).message as number);
      }
    }
    return vmEvaluation;
  }

  sendAttrUI(nodeId: string, num: number) {
    const objectNode = this.nodes[nodeId] as ObjectNode;
    if (!objectNode) return;
    let text = objectNode.text.split(" ");
    text[2] = num.toString();
    objectNode.text = text.join(" ");
    objectNode.arguments[1] = num;
    objectNode.inlets[1].lastMessage = num;
    if (objectNode && objectNode.custom) {
      (objectNode.custom as any).value = num;
    }
    return this.evaluateNode(nodeId, `${text[1]} ${num}`);
  }
}

const deserializeInstruction = (
  serialized: SerializedInstruction,
  nodes: { [id: string]: Node },
): Instruction => {
  const node = nodes[serialized.node as string];
  const additionalNodes: ObjectNode[] | undefined = serialized.nodes ? [] : undefined;
  if (additionalNodes && serialized.nodes) {
    for (const nodeId of serialized.nodes) {
      const node = nodes[nodeId];
      if (node) {
        additionalNodes.push(node as ObjectNode);
      }
    }
  }
  let branches: Instruction[][] | undefined;
  if (serialized.branches) {
    branches = [];
    for (const branch of serialized.branches) {
      const deserializedBranch: Instruction[] = [];
      for (const branchInstruction of branch) {
        deserializedBranch.push(deserializeInstruction(branchInstruction, nodes));
      }
      branches.push(deserializedBranch);
    }
    return {
      type: InstructionType.Branch,
      branches,
      node,
    };
  }
  return {
    type: serialized.type as Exclude<InstructionType, InstructionType.Branch>,
    node,
    inlet: node?.inlets[serialized.inletNumber as number],
    inletNumber: serialized.inletNumber,
    outletNumber: serialized.outletNumber,
    nodes: additionalNodes,
  };
};
