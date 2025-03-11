import { Instruction, InstructionType, SerializedInstruction } from "./types";
import { Node } from "@/lib/nodes/types";

export const serializeInstruction = (instruction: Instruction): SerializedInstruction => {
  const node = instruction.node?.id;
  let branches: SerializedInstruction[][] | undefined;
  if (instruction.branches) {
    branches = [];
    for (const branch of instruction.branches) {
      const serializedBranch: SerializedInstruction[] = [];
      for (const branchInstruction of branch) {
        serializedBranch.push(serializeInstruction(branchInstruction));
      }
      branches.push(serializedBranch);
    }
    return {
      type: InstructionType.Branch,
      branches,
      node,
    };
  }
  return {
    type: instruction.type as Exclude<InstructionType, InstructionType.Branch>,
    node,
    inletNumber: instruction.inletNumber,
    outletNumber: instruction.outletNumber,
    nodes: instruction.nodes?.map((x) => x.id),
  };
};

export const getNodesFromInstructions = (instructions: Instruction[]): Node[] => {
  const nodes = new Set<Node>();

  for (const instruction of instructions) {
    if (instruction.node) {
      nodes.add(instruction.node);
    }
    if (instruction.nodes) {
      for (const node of instruction.nodes) {
        nodes.add(node);
      }
    }
    if (instruction.branches) {
      for (const branch of instruction.branches) {
        const branchNodes = getNodesFromInstructions(branch);
        for (const n of branchNodes) {
          nodes.add(n);
        }
      }
    }
  }
  return Array.from(nodes);
};
