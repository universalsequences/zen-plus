import { Instruction, InstructionType } from "./types";
import { AttributeValue, Message, MessageNode, ObjectNode, OptimizedDataType } from "../types";
import { evaluateAttributeInstruction } from "./attribute";
import { isObjectNode } from "./instructions";
import { forwardTraversal } from "./traversal";

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

export interface OptimizedMainThreadInstruction {
  nodeId: string;
  optimizedDataType: OptimizedDataType;
  message: number | number[];
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

export interface UpdateUX {
  nodeId: string;
  message: Message;
}

const matchesDataType = (
  dataTypes: OptimizedDataType[],
  message: Message,
): OptimizedDataType | null => {
  if (typeof message === "number") {
    if (dataTypes.includes(OptimizedDataType.NUMBER)) {
      return OptimizedDataType.NUMBER;
    }
  }
  if (Array.isArray(message) && message.every((x) => typeof x === "number")) {
    if (dataTypes.includes(OptimizedDataType.FLOAT_ARRAY)) {
      return OptimizedDataType.FLOAT_ARRAY;
    }
  }
  return null;
};

export const evaluate = (
  _instructions: Instruction[],
  _initialMessage: Message = "bang",
  stopOnEmpty = false,
) => {
  let initialMessage: Message | undefined = _initialMessage;
  const replaceMessages: ReplaceMessage[] = [];
  const objectsEvaluated: ObjectNode[] = [];
  const mainThreadInstructions: MainThreadInstruction[] = [];
  const optimizedMainThreadInstructions: OptimizedMainThreadInstruction[] = [];
  const attributeUpdates: AttributeUpdate[] = [];
  const skippedInstructions: {
    value: Message;
    instructions: Instruction[];
  }[] = [];

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
            //throw new Error("missing outlet number for pipe");
          }
          const messageToPipe =
            messageNode.inlets[0].lastMessage === undefined
              ? _initialMessage
              : messageNode.inlets[0].lastMessage; // register[instruction.outletNumber];

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

          /*
           * note: this is for compiling zen patches . when we reach an evaluation instruction
           * where the data is not ready, we end up splicing instructions
          let skip = false;
          if (
            (objectNode.inlets[0] && objectNode.inlets[0].lastMessage === undefined) ||
            objectNode.arguments.slice(0, objectNode.inlets.length - 1).some((x) => x === undefined)
          ) {
            if (stopOnEmpty && objectNode.name !== "out") {
              console.log(
                "%cmissing inlet message for object node evaluation id=%s",
                "color:red",
                objectNode.id,
                objectNode.text,
                objectNode,
                [
                  objectNode.inlets[0]?.lastMessage,
                  ...objectNode.arguments.slice(0, objectNode.inlets.length - 1),
                ],
                instructions.map((x) => x.node?.id),
              );
              return {
                mainThreadInstructions,
                objectsEvaluated,
                replaceMessages,
                instructionsEvaluated: emittedInstructions,
                attributeUpdates,
                optimizedMainThreadInstructions,
              };
              const forward = forwardTraversal(objectNode);
              const instructs: Instruction[] = [instruction];
              while (instructions.length > 0) {
                const next = instructions[0];
                if (next.node && forward.includes(next.node) && next.node.name !== "out") {
                  //console.log("moving foward node=%s id=%s", next.node.text, next.node.id);
                  const instr = instructions.shift();
                  if (instr) {
                    instructs.push(instr);
                  }
                } else {
                  if (objectNode.inlets[0].lastMessage === undefined && register[0] === undefined) {
                    console.log("skipping add");
                    break;
                  }
                  skippedInstructions.push({
                    value: register[0] as Message,
                    instructions: instructs,
                  });
                  break;
                }
              }
              skippedInstructions.push({
                value: register[0] as Message,
                instructions: instructs,
              });

              break;
            }
          }
          */

          // note - store operation needs to store in inlet as well
          const inputMessage =
            initialMessage !== undefined
              ? initialMessage
              : objectNode.inlets[0].lastMessage === undefined
                ? initialMessage
                : objectNode.inlets[0].lastMessage;

          if (objectNode.fn && inputMessage !== undefined) {
            if (objectNode.skipCompilation) {
              const { optimizedDataType } = objectNode.inlets[0];
              const matchedDataType =
                optimizedDataType && matchesDataType(optimizedDataType, inputMessage);
              if (matchedDataType) {
                optimizedMainThreadInstructions.push({
                  nodeId: objectNode.id,
                  optimizedDataType: matchedDataType,
                  message: inputMessage as number | number[],
                });
              } else if (objectNode.needsMainThread) {
                mainThreadInstructions.push({
                  nodeId: objectNode.id,
                  inletMessages: [
                    inputMessage,
                    ...objectNode.inlets.slice(1).map((x) => x.lastMessage),
                  ],
                });
              }
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
            } else {
              inlet.lastMessage = register[outletNumber] as Message;
            }
            /*
            if (false && (node as ObjectNode).needsMainThread) {
              const inletMessages = new Array(node.inlets.length).fill(undefined);
              inletMessages[inletNumber] = register[outletNumber] as Message;
              mainThreadInstructions.push({
                nodeId: node.id,
                inletMessages,
              });
            } else {

            }
            */
          } else {
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

      if (initialMessage !== undefined) {
        // consumed initial message
        initialMessage = undefined;
      }
      if (instruction.node) {
        instruction.node.debugBranching = peekBranching();
      }
    }

    /*
    console.log(
      "instructions evaluated",
      emittedInstructions.length,
      emittedInstructions[0]?.node?.text,
      emittedInstructions,
      _initialMessage,
    );
    */
    return {
      skippedInstructions,
      mainThreadInstructions,
      objectsEvaluated,
      replaceMessages,
      instructionsEvaluated: emittedInstructions,
      attributeUpdates,
      optimizedMainThreadInstructions,
    };
  } catch (e) {
    console.log("error=", e);
    return {
      skippedInstructions,
      mainThreadInstructions,
      objectsEvaluated,
      replaceMessages,
      instructionsEvaluated: [],
      attributeUpdates,
      optimizedMainThreadInstructions,
    };
  }
};

const flatten = (instructions: Instruction[]): Instruction[] => {
  return instructions.flatMap((x) =>
    x.branches ? [x, ...x.branches.flatMap((y) => flatten(y))] : x,
  );
};
