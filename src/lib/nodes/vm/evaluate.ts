import { Instruction, InstructionType } from "./types";
import { Message, MessageNode, ObjectNode } from "../types";

interface Branching {
  input: (Message | undefined)[];
  branches: Instruction[][];
  consumed: number[];
  register: (Message | undefined)[];
}

export const evaluate = (
  _instructions: Instruction[],
  initialMessage: Message = "bang",
  debug = false,
) => {
  try {
    let a = new Date().getTime();
    const instructions = [..._instructions];
    let register: (Message | undefined)[] = new Array(16)
      .fill(initialMessage)
      .map((x) => initialMessage);
    const branchingStack: Branching[] = [];

    const objectsEvaluated: ObjectNode[] | undefined = debug ? [] : undefined;
    const peekBranching = () => {
      return branchingStack[branchingStack.length - 1];
    };

    const getNext = (): Instruction | undefined => {
      if (branchingStack.length > 0) {
        const branching = peekBranching();
        let instruction: Instruction | undefined = undefined;
        for (let i = 0; i < branching.branches.length; i++) {
          if (branching.input[i] === undefined) {
            // skip this branch
            continue;
          }
          const branch = branching.branches[i];
          if (branch.length > 0) {
            instruction = branch.shift();
            if (branching.consumed[i] === 0) {
              // first instruction from branch so we bring back the original input
              register = [...branching.register];
            }
            branching.consumed[i]++;
            return instruction;
          }
        }
        if (instruction === undefined) {
          // we have consumed the branch completely and should pop
          const b = branchingStack.pop();
          const next = getNext();
          return next;
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
          } else if (messageToPipe !== undefined) {
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
          const messageToReplace = register[instruction.outletNumber];
          if (messageToReplace !== undefined) {
            const messageNode = instruction.node as MessageNode;
            messageNode.message = messageToReplace;
            if (messageNode.onNewValue) {
              messageNode.onNewValue(messageToReplace);
            }
          }
          break;
        }
        case InstructionType.EvaluateObject:
          const objectNode = instruction.node as ObjectNode;

          // note - store operation needs to store in inlet as well
          const inputMessage =
            objectNode.inlets[0].lastMessage === undefined
              ? initialMessage
              : objectNode.inlets[0].lastMessage;
          if (objectNode.fn && inputMessage !== undefined) {
            register = objectNode.fn(inputMessage);

            objectsEvaluated?.push(objectNode);
          } else {
            console.log("no msg...");
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
            branches: instruction.branches.map((x) => [...x]),
            consumed: instruction.branches.map((x) => 0),
            register: [...register],
          };
          branchingStack.push(branch);
          //console.log("%cpushing onto branch stack now", "color:lime", [...branchingStack]);
          break;
        }
        case InstructionType.Attribute:
          //console.log("needs implementation");
          break;
      }
    }
    let b = new Date().getTime();
    console.log("instructions len=%s took %s ms", _instructions.length, b - a);
    return objectsEvaluated;
  } catch (e) {
    console.log("error=", e);
    return [];
  }
};
