import { Instruction, InstructionType } from "./types";
import { Message, MessageNode, ObjectNode } from "../types";

interface Branching {
  input: (Message | undefined)[];
  branches: Instruction[][];
}

export const evaluate = (_instructions: Instruction[], initialMessage = "bang") => {
  const instructions = [..._instructions];
  let register: (Message | undefined)[] = [];
  const branchingStack: Branching[] = [];

  const peekBranching = () => {
    return branchingStack[branchingStack.length - 1];
  };

  const getNext = (): Instruction | undefined => {
    if (branchingStack.length > 0) {
      const branching = peekBranching();
      let instruction: Instruction | undefined = undefined;
      for (let i = 0; i < branching.branches.length; i++) {
        const branch = branching.branches[i];
        if (branch.length > 0) {
          instruction = branch.shift();
          return instruction;
        }
      }
      if (instruction === undefined) {
        // we have consumed the branch completely and should pop
        branchingStack.pop();
        return getNext();
      }
    }
    return instructions.shift();
  };

  for (let instruction = getNext(); instruction !== undefined; instruction = getNext()) {
    switch (instruction.type) {
      case InstructionType.PipeMessage: {
        // trigger/pipe mesasge
        const messageNode = instruction.node as MessageNode;
        if (instruction.outletNumber === undefined) {
          throw new Error("missing outlet number for pipe");
        }
        const messageToPipe = register[instruction.outletNumber];

        if (messageToPipe === "bang") {
          // send out
          register.length = 0;

          // TODO - should skip if no message...
          register[0] = messageNode.message || "";
        } else if (messageToPipe) {
          register = [messageNode.pipeIfApplicable(messageToPipe)];
        } else {
          // should throw or skip?
        }
        break;
      }
      case InstructionType.ReplaceMessage: {
        if (instruction.outletNumber === undefined) {
          throw new Error("missing outlet number for pipe");
        }
        const messageToPipe = register[instruction.outletNumber];
        if (messageToPipe) {
          const messageNode = instruction.node as MessageNode;
          messageNode.message = messageToPipe;
        }
        break;
      }
      case InstructionType.EvaluateObject:
        const objectNode = instruction.node as ObjectNode;

        // note - store operation needs to store in inlet as well
        const inputMessage = objectNode.inlets[0].lastMessage || initialMessage;
        if (objectNode.fn && inputMessage !== undefined) {
          register = objectNode.fn(inputMessage);
        }
        break;
      case InstructionType.Store: {
        const { inlet, inletNumber, outletNumber, node } = instruction;
        if (
          inlet &&
          outletNumber !== undefined &&
          register[outletNumber] !== undefined &&
          node &&
          inletNumber !== undefined
        ) {
          if ((node as ObjectNode).arguments) {
            // store results in arguments (for inlets 1...) and inlet (for inlet 0)
            (node as ObjectNode).arguments[inletNumber - 1] = register[outletNumber] as Message;
            inlet.lastMessage = register[outletNumber] as Message;
          }
        }
        break;
      }
      case InstructionType.Branch: {
        // based on the previous
        const branch: Branching = {
          input: [...register],
          branches: instruction.branches,
        };
        branchingStack.push(branch);
        console.log("%cpushing onto branch stack now", "color:lime", [...branchingStack]);
        break;
      }
      case InstructionType.Attribute:
        console.log("needs implementation");
        break;
    }

    console.log(
      "node.id=%c%s /// register now",
      "color:red",
      instruction.node?.id,
      [...register],
      instruction,
    );
  }
};
