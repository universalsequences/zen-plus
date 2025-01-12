import { Instruction, InstructionType } from "./types";
import { Message, MessageNode, ObjectNode } from "../types";

export const evaluate = (instructions: Instruction[]) => {
  let register: (Message | undefined)[] = [];

  for (const instruction of instructions) {
    switch (instruction.type) {
      case InstructionType.PipeMessage:
        const messageNode = instruction.node as MessageNode;
        register = [messageNode.message];
        break;
      case InstructionType.EvaluateObject:
        const objectNode = instruction.node as ObjectNode;

        // note - store operation needs to store in inlet as well
        const inputMessage = objectNode.inlets[0].lastMessage;
        if (objectNode.fn && inputMessage !== undefined) {
          register = objectNode.fn(inputMessage);
        }
        break;
      case InstructionType.Store:
        const { inlet, inletNumber, outletNumber, node } = instruction;
        if (
          outletNumber !== undefined &&
          register[outletNumber] !== undefined &&
          node &&
          inletNumber !== undefined
        ) {
          if ((node as ObjectNode).arguments) {
            // Object case
            (node as ObjectNode).arguments[inletNumber - 1] = register[outletNumber] as Message;
          } else {
            // Message Case

            if (inletNumber === 0) {
              // inlet 1 case for message
            } else {
              // inlet 2 case for message: "replace" and don't send
              // this is complicated because the topological sort places the next node immediately after
              // its almost like we need the whole branch stored in case it comes to this and
            }
          }
        }
        break;
      case InstructionType.Attribute:
        console.log("needs implementation");
        break;
    }

    console.log("register now", register, instruction);
  }
};
