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
} from "@/lib/nodes/types";
import { MockObjectNode } from "../../../test/mocks/MockObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import {
  type Instruction,
  InstructionType,
  type SerializedInstruction,
} from "@/lib/nodes/vm/types";
import type { NodeInstructions } from "../core";
import { MainThreadInstruction, ReplaceMessage, evaluate } from "@/lib/nodes/vm/evaluate";
import { isMessageNode } from "@/lib/nodes/vm/instructions";
import { isNumberObject } from "util/types";

export interface OnNewValue {
  nodeId: string;
  value: Message;
}

export interface OnNewSharedBuffer {
  nodeId: string;
  sharedBuffer: SharedArrayBuffer;
}

export interface VMEvaluation {
  replaceMessages: ReplaceMessage[];
  objectsEvaluated?: ObjectNode[];
  mainThreadInstructions: MainThreadInstruction[];
  onNewValue: OnNewValue[];
  onNewSharedBuffer: OnNewSharedBuffer[];
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
  newSharedBuffers: OnNewSharedBuffer[] = [];

  sendEvaluationToMainThread?: (evaluation: VMEvaluation) => void;

  constructor() {
    this.nodes = {};
    this.patch = new MockPatch(undefined);
    this.nodeInstructions = {};
    this.onNewValue = [];
  }

  setNodes(objects: SerializedObjectNode[], messages: SerializedMessageNode[]) {
    const p = new MockPatch(undefined);
    p.vm = this;

    for (const o of objects) {
      if (this.nodes[o.id]) continue;
      let o1 = (this.nodes[o.id] as ObjectNode) || new MockObjectNode(p);
      o1.onNewValue = (value) => this.onNewValue.push({ nodeId: o1.id, value: value });
      o1.onNewSharedBuffer = (value) => {
        console.log("new shared buffer emitted", value);
        this.newSharedBuffers.push({ nodeId: o1.id, sharedBuffer: value });
      };
      o1.fromJSON(o);
      this.nodes[o1.id] = o1;

      if (o1.needsLoad) {
        o1.fn?.("bang");
      }
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

  // TODO - call this whenever an object updates from main thread
  updateObject(nodeId: string, serializedNode: SerializedObjectNode) {
    if (this.nodes[nodeId]) {
      (this.nodes[nodeId] as ObjectNode).fromJSON(serializedNode);
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

  evaluateNode(nodeId: string, message: Message): VMEvaluation {
    const instructions = this.nodeInstructions[nodeId];
    if (!instructions) {
      throw new Error("no instructions found");
    }
    const o = evaluate(instructions, message);
    const vmEvaluation: VMEvaluation = {
      ...o,
      onNewValue: this.onNewValue,
      onNewSharedBuffer: this.newSharedBuffers,
    };

    return vmEvaluation;
  }

  clear() {
    this.onNewValue.length = 0;
    this.newSharedBuffers.length = 0;
  }
}

const deserializeInstruction = (
  serialized: SerializedInstruction,
  nodes: { [id: string]: Node },
): Instruction => {
  const node = nodes[serialized.node as string];
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
  };
};
