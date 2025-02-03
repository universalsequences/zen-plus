import type { Message, ObjectNode } from "../types";
import { MainThreadInstruction } from "./evaluate";
import { Instruction, InstructionType } from "./types";

export const createAttributeInstruction = (node: ObjectNode, outletNumber: number): Instruction => {
  // find all the potential matching nodes: params/uniforms
  // upon execution of the instruction, we'll check which ones have the right name
  // TODO - if we know the type of string we'll get will contain a certain name, we can
  // optimize this by filtering the right nodes
  const nodes = node.subpatch?.getAllNodes().filter((x) => {
    const { name } = x;
    return name === "param" || name === "uniform";
  });
  return {
    type: InstructionType.Attribute,
    node,
    nodes,
    outletNumber,
  };
};

export const evaluateAttributeInstruction = (
  message: Message,
  instruction: Instruction,
): MainThreadInstruction[] => {
  if (typeof message !== "string") {
    return [];
  }

  // convert param/uniform sets into main thread instructions
  const mainThreadInstructions: MainThreadInstruction[] = [];

  const tokens = message.split(" ");
  const name = tokens[0];
  const value = Number.parseFloat(tokens[1]);
  // todo - extract time
  const matchingNodes = instruction.nodes?.filter((x) => x.arguments[0] === name) || [];

  for (const node of matchingNodes) {
    mainThreadInstructions.push({
      nodeId: node.id,
      inletMessages: [value],
    });
  }

  return mainThreadInstructions;
};
