import { Node, IOlet, Message, ObjectNode, MessageNode } from "../types";

export enum InstructionType {
  EvaluateObject = "EvaluateObject", // executes node function, storing result in register
  PipeMessage = "PipeMessage", // executes node function, storing result in register
  ReplaceMessage = "ReplaceMessage", // executes node function, storing result in register
  Store = "Store", // stores value in register inside inlet / message node
  Attribute = "Attribute",
  Branch = "Branch",
}

export interface Instruction {
  type: InstructionType;
  node?: Node;
  inlet?: IOlet;
  inletNumber?: number;
  outletNumber?: number;
  loadAtStart?: boolean;
  branches?: Instruction[][];
}
