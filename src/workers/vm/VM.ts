import { MockPatch } from "../../../test/mocks/MockPatch";
import type {
  Message,
  SerializedMessageNode,
  SerializedObjectNode,
  Node,
  Patch,
  ObjectNode,
  MessageNode,
} from "@/lib/nodes/types";
import { MockObjectNode } from "../../../test/mocks/MockObjectNode";
import MessageNodeImpl from "@/lib/nodes/MessageNode";
import {
  type Instruction,
  InstructionType,
  type SerializedInstruction,
} from "@/lib/nodes/vm/types";
import type { NodeInstructions } from "../core";
import { evaluate } from "@/lib/nodes/vm/evaluate";

export interface OnNewValue {
  nodeId: string;
  value: Message;
}

export interface OnNewSharedBuffer {
  nodeId: string;
  sharedBuffer: SharedArrayBuffer;
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
  onNewSharedBuffer: OnNewSharedBuffer[] = [];

  constructor() {
    this.nodes = {};
    this.patch = new MockPatch(undefined);
    this.nodeInstructions = {};
    this.onNewValue = [];
  }

  setNodes(objects: SerializedObjectNode[], messages: SerializedMessageNode[]) {
    const p = new MockPatch(undefined);

    for (const o of objects) {
      if (this.nodes[o.id]) continue;
      let o1 = (this.nodes[o.id] as ObjectNode) || new MockObjectNode(p);
      o1.onNewValue = (value) => this.onNewValue.push({ nodeId: o1.id, value: value });
      o1.onNewSharedBuffer = (value) =>
        this.onNewSharedBuffer.push({ nodeId: o1.id, sharedBuffer: value });
      o1.fromJSON(o);
      this.nodes[o1.id] = o1;
    }
    for (const m of messages) {
      let m1 = (this.nodes[m.id] as MessageNode) || new MessageNodeImpl(p, m.messageType);
      m1.fromJSON(m);
      this.nodes[m1.id] = m1;
    }

    return {
      onNewSharedBuffer: this.onNewSharedBuffer,
    };
  }

  // TODO - call this whenever an object updates from main thread
  updateObject(nodeId: string, serializedNode: SerializedObjectNode) {
    if (this.nodes[nodeId]) {
      (this.nodes[nodeId] as ObjectNode).fromJSON(serializedNode);
    }
  }

  setNodeInstructions(nodeInstructions: NodeInstructions[]) {
    console.log("set node instructions", nodeInstructions);
    for (const { nodeId, instructions } of nodeInstructions) {
      const deserializedInstructions: Instruction[] = [];
      for (const instruction of instructions) {
        deserializedInstructions.push(deserializeInstruction(instruction, this.nodes));
      }
      this.nodeInstructions[nodeId] = deserializedInstructions;
    }
  }

  evaluateNode(nodeId: string, message: Message) {
    this.onNewValue.length = 0;
    this.onNewSharedBuffer.length = 0;
    const instructions = this.nodeInstructions[nodeId];
    if (!instructions) {
      throw new Error("no instructions found");
    }
    const o = evaluate(instructions, message);
    console.log("evaluation", o);
    return {
      ...o,
      onNewValue: this.onNewValue,
      onNewSharedBuffer: this.onNewSharedBuffer,
    };
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
