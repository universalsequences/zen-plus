import { Instruction, InstructionType } from "./types";
import { AttributeValue, Message, MessageNode, ObjectNode } from "../types";
import { evaluateAttributeInstruction } from "./attribute";
import { isObjectNode } from "./instructions";

export interface Branching {
  id?: string;
  input: (Message | undefined)[];
  branches: Instruction[][];
  consumed: number[];
  register: (Message | undefined)[];
  parent?: Branching;
}

export interface MainThreadInstruction {
  nodeId: string;
  inletMessages: (Message | undefined)[];
}

export interface ReplaceMessage {
  messageId: string;
  message?: Message;
  sharedBuffer?: SharedArrayBuffer;
}

export interface AttributeUpdate {
  nodeId: string;
  message: AttributeValue;
}

export const evaluate = (_instructions: Instruction[], _initialMessage: Message = "bang") => {
  let initialMessage: Message | undefined = _initialMessage;
  const replaceMessages: ReplaceMessage[] = [];
  const objectsEvaluated: ObjectNode[] = [];
  const mainThreadInstructions: MainThreadInstruction[] = [];
  const attributeUpdates: AttributeUpdate[] = [];

  // TODO - need to keep track of all STOREs into nodes with skipCompilation along w/
  // any evaluateObject for skipCompilation  nodes (we will tell the main thread to run them)
  try {
    const instructions = [..._instructions];
    let register: (Message | undefined)[] = new Array(16)
      .fill(initialMessage)
      .map(() => initialMessage);
    const branchingStack: Branching[] = [];

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
          branchingStack.pop();
          const next = getNext();
          return next;
        }
      }
      return instructions.shift();
    };

    const emittedInstructions: Instruction[] = [];
    //let instructionCounter = 0;
    for (let instruction = getNext(); instruction !== undefined; instruction = getNext()) {
      emittedInstructions.push(instruction);
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
            if (
              ArrayBuffer.isView(messageToReplace) &&
              (messageToReplace as Float32Array).buffer instanceof SharedArrayBuffer
            ) {
              replaceMessages.push({
                messageId: messageNode.id,
                sharedBuffer: (messageToReplace as Float32Array).buffer as SharedArrayBuffer,
              });
            } else {
              replaceMessages.push({
                messageId: messageNode.id,
                message: messageToReplace,
              });
            }
          }
          break;
        }
        case InstructionType.EvaluateObject:
          // TODO - need to first determine that all inlets have messages
          const objectNode = instruction.node as ObjectNode;

          // note - store operation needs to store in inlet as well
          const inputMessage =
            initialMessage !== undefined
              ? initialMessage
              : objectNode.inlets[0].lastMessage === undefined
                ? initialMessage
                : objectNode.inlets[0].lastMessage;

          if (initialMessage !== undefined) {
            // consumed initial message
            initialMessage = undefined;
          }
          if (objectNode.fn && inputMessage !== undefined) {
            if (objectNode.skipCompilation) {
              mainThreadInstructions.push({
                nodeId: objectNode.id,
                inletMessages: [
                  inputMessage,
                  ...objectNode.inlets.slice(1).map((x) => x.lastMessage),
                ],
              });
            } else {
              if (instruction.nodes) {
                // instruction includes nodes, so we tag the object with them so they may use it
                objectNode.instructionNodes = instruction.nodes;
              }
              register = objectNode.fn(inputMessage);
              objectsEvaluated?.push(objectNode);
            }
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
              if (inletNumber > 0) {
                (node as ObjectNode).arguments[inletNumber - 1] = register[outletNumber] as Message;
              }
              inlet.lastMessage = register[outletNumber] as Message;
            }
            if (node.skipCompilation) {
              const inletMessages = new Array(node.inlets.length).fill(undefined);
              inletMessages[inletNumber] = register[outletNumber] as Message;
              mainThreadInstructions.push({
                nodeId: node.id,
                inletMessages,
              });
            }
          }
          break;
        }
        case InstructionType.Branch: {
          // based on the previous
          const branch: Branching = {
            id: instruction.node?.id,
            parent: peekBranching(),
            input: [...register],
            branches: instruction.branches.map((x) => [...x]),
            consumed: instruction.branches.map(() => 0),
            register: [...register],
          };
          branchingStack.push(branch);
          break;
        }
        case InstructionType.Attribute:
          const { outletNumber, nodes, node } = instruction;
          const attributeValue =
            register[outletNumber as number] === undefined
              ? initialMessage
              : register[outletNumber as number];
          if ((nodes?.length || 0) > 0 && outletNumber !== undefined && attributeValue) {
            mainThreadInstructions.push(
              ...evaluateAttributeInstruction(attributeValue as Message, instruction),
            );
          } else if (node && isObjectNode(node) && typeof attributeValue === "string") {
            (node as ObjectNode)?.processMessageForAttributes(attributeValue as Message);
            attributeUpdates.push({
              nodeId: node.id,
              message: attributeValue as AttributeValue,
            });
          }
          break;
      }

      if (instruction.node) {
        instruction.node.debugBranching = peekBranching();
      }
    }
    return {
      mainThreadInstructions,
      objectsEvaluated,
      replaceMessages,
      instructionsEvaluated: emittedInstructions,
      attributeUpdates,
    };
  } catch (e) {
    console.log("error=", e);
    return {
      mainThreadInstructions,
      objectsEvaluated,
      replaceMessages,
      instructionsEvaluated: [],
      attributeUpdates,
    };
  }
};

const flatten = (instructions: Instruction[]): Instruction[] => {
  return instructions.flatMap((x) =>
    x.branches ? [x, ...x.branches.flatMap((y) => flatten(y))] : x,
  );
};
