import { Node, IOlet, Message, ObjectNode, MessageNode } from "../types";

export enum InstructionType {
  EvaluateObject = "EvaluateObject", // executes node function, storing result in register
  PipeMessage = "PipeMessage", // executes node function, storing result in register
  ReplaceMessage = "ReplaceMessage", // executes node function, storing result in register
  Store = "Store", // stores value in register inside inlet / message node
  Attribute = "Attribute",
  Branch = "Branch",
}

// Base interface with common properties
interface BaseInstruction {
  node?: Node;
  inlet?: IOlet;
  inletNumber?: number;
  outletNumber?: number;
  loadAtStart?: boolean;
}

// Branch-specific instruction
interface BranchInstruction extends BaseInstruction {
  type: InstructionType.Branch;
  branches: Instruction[][];
}

// Non-branch instruction
interface NonBranchInstruction extends BaseInstruction {
  type: Exclude<InstructionType, InstructionType.Branch>;
  branches?: never;
}

// Combined instruction type
export type Instruction = BranchInstruction | NonBranchInstruction;

export type SerializedInstruction = {
  node?: string;
  inletNumber?: number;
  outletNumber?: number;
  loadAtStart?: boolean;
  type: InstructionType;
  branches?: SerializedInstruction[][];
};
