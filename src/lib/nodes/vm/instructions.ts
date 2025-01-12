import { Node, ObjectNode, IOConnection, MessageNode, SubPatch } from "../types";
import { forwardTraversal } from "./traversal";
import { Instruction, InstructionType } from "./types";

const pushInstruction = (
  instructions: Instruction[],
  instruction: Instruction,
  branch: Branch | undefined,
  branchIndex: number,
) => {
  if (branch) {
    branch.branches[branchIndex].push(instruction);
  } else {
    instructions.push(instruction);
  }
};

const compileConnection = (
  connection: IOConnection,
  branch: Branch | undefined,
  branchIndex: number,
): Instruction[] => {
  const instructions: Instruction[] = [];
  const { destinationInlet, source, destination, sourceOutlet } = connection;
  const inletNumber = destination.inlets.indexOf(destinationInlet);
  const outletNumber = source.outlets.indexOf(sourceOutlet);

  console.log("compile connection dest.id", connection.destination.id, branch, branchIndex);

  // handle attribute case
  if (inletNumber === 0) {
    // possible attribute (will later check if the register message is a string of correct form)
    // TODO - if subpatch, then add a list of possible matching nodes for attrbute handling
    const instruction = {
      type: InstructionType.Attribute,
      node: destination,
    };
    pushInstruction(instructions, instruction, branch, branchIndex);
  }
  const subpatch = (destination as ObjectNode).subpatch;
  if (subpatch) {
    // we have a subpatch, so store correct output of "in X" nodes
    const input = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber,
    );

    if (input) {
      const connections = input.outlets.flatMap((outlet) => outlet.connections);
      const compiledInstructions = connections.flatMap((c) =>
        compileConnection(c, branch, branchIndex),
      );
      for (const instruction of compiledInstructions) {
        pushInstruction(instructions, instruction, branch, branchIndex);
      }
      //instructions.push(...connections.flatMap((c) => compileConnection(c, branch, branchIndex)));
    }
  } else if ((destination as ObjectNode).name === "out") {
    // we have out so we need to find the right inlet to store in
    const subpatch = destination.patch as SubPatch;
    const outletNumber = ((destination as ObjectNode).arguments[0] as number) - 1;
    if (subpatch) {
      const compiledInstructions = subpatch.parentNode.outlets[outletNumber].connections.flatMap(
        (c) => compileConnection(c, branch, branchIndex),
      );
      for (const instruction of compiledInstructions) {
        pushInstruction(instructions, instruction, branch, branchIndex);
      }
    }
  } else if ((destination as MessageNode).messageType !== undefined) {
    // message type
    const instruction = {
      type: inletNumber === 0 ? InstructionType.PipeMessage : InstructionType.ReplaceMessage,
      node: destination,
    };
    pushInstruction(instructions, instruction, branch, branchIndex);
  } else {
    const instruction = {
      type: InstructionType.Store,
      inletNumber,
      inlet: destinationInlet,
      outletNumber,
      node: destination,
    };
    pushInstruction(instructions, instruction, branch, branchIndex);
  }

  return instructions;
};

interface Branch {
  rootNode: Node;
  branches: Instruction[][];
}

const isNodeInBranch = (node: Node, branch: Branch): boolean => {
  if (node === branch.rootNode) return true;
  const forwardNodes = forwardTraversal(branch.rootNode);
  return forwardNodes.includes(node);
};

const getBranchIndex = (node: Node, branch: Branch) => {
  for (let i = 0; i < branch.rootNode.outlets.length; i++) {
    const outlet = branch.rootNode.outlets[i];
    const outletNodes = outlet.connections.flatMap((c) => forwardTraversal(c.destination));
    if (outletNodes.includes(node)) {
      return i;
    }
  }
  return -1;
};

const peek = (stack: Branch[]): Branch | undefined => stack[stack.length - 1];

export const createInstructions = (nodes: Node[]) => {
  const instructions: Instruction[] = [];
  const branchStack: Branch[] = [];
  for (const node of nodes) {
    if ((node as ObjectNode).name) {
      // TODO if we are in branch need to find branch index

      if ((node as ObjectNode).branching) {
        // we're at a branch so push new branch onto stack
        branchStack.push({
          rootNode: node,
          branches: node.outlets.map(() => []),
        });
        console.log("added to stack", peek(branchStack), node);
      }
    }

    const branch = peek(branchStack);
    const inBranch = branch && isNodeInBranch(node, branch);
    const branchIndex = inBranch ? getBranchIndex(node, branch) : -1;

    console.log("node.id=%s inBranch=%s index=%s", node.id, inBranch, branchIndex);

    if ((node as ObjectNode).name) {
      // TODO if we are in branch need to find branch index

      const instruction = {
        type: InstructionType.EvaluateObject,
        node,
        loadAtStart: (node as ObjectNode).needsLoad, // tells the evaluator that if we are running some other branch, to skip this
      };
      if (inBranch && branchIndex >= 0) {
        branch.branches[branchIndex].push(instruction);
      } else {
        instructions.push(instruction);
      }
    }

    for (let i = 0; i < node.outlets.length; i++) {
      const outlet = node.outlets[i];
      for (const connection of outlet.connections) {
        console.log("calling compiled connection from", node.id);
        const compiledConnection = compileConnection(
          connection,
          branchIndex >= 0 && inBranch ? branch : undefined,
          branchIndex,
        );
        if (inBranch) {
          // need to know what branch index to choose by forward traversaing
          branch.branches[branchIndex === -1 ? i : branchIndex].push(...compiledConnection);
        } else {
          instructions.push(...compiledConnection);
        }
      }
    }
  }
  while (branchStack.length > 0) {
    const branch = branchStack.pop();
    if (branch) {
      instructions.push({
        type: InstructionType.Branch,
        branches: branch?.branches,
      });
    }
    // add the branches
  }
  return instructions;
};
