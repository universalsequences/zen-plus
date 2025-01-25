import {
  Node,
  ObjectNode,
  IOConnection,
  MessageNode,
  SubPatch,
  IOlet,
  MessageType,
} from "../types";
import {
  forwardTraversal,
  getInboundConnections,
  getOutboundConnections,
  getOutboundConnectionsFromOutlet,
} from "./traversal";
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

const isMessageNode = (node: Node, messageType?: MessageType) =>
  (messageType !== undefined ? (node as MessageNode).messageType === messageType : true) &&
  (node as MessageNode).messageType !== undefined;

const isObjectNode = (node: Node) => (node as ObjectNode).name !== undefined;

const compileConnection = (connection: IOConnection): Instruction[] => {
  const instructions: Instruction[] = [];
  const { destinationInlet, source, destination, sourceOutlet } = connection;
  const inletNumber = destination.inlets.indexOf(destinationInlet);
  const inbound = getInboundConnections(sourceOutlet);
  const outletNumber = inbound[0].source.outlets.indexOf(inbound[0].sourceOutlet);

  if (outletNumber === -1) {
    throw new Error("outlet number -1");
  }

  // handle attribute case
  if (inletNumber === 0) {
    // possible attribute (will later check if the register message is a string of correct form)
    // TODO - if subpatch, then add a list of possible matching nodes for attrbute handling
    const instruction: Instruction = {
      type: InstructionType.Attribute,
      node: destination,
    };
    instructions.push(instruction);
    //pushInstruction(instructions, instruction, branch, branchIndex);
  }
  const subpatch = (destination as ObjectNode).subpatch;
  if (subpatch) {
    // we have a subpatch, so store correct output of "in X" nodes
    const input = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber,
    );

    if (input) {
      const connections = input.outlets.flatMap((outlet) => outlet.connections);
      const compiledInstructions = connections.flatMap((c) => compileConnection(c));
      for (const instruction of compiledInstructions) {
        instructions.push(instruction);
        //pushInstruction(instructions, instruction, branch, branchIndex);
      }
      //instructions.push(...connections.flatMap((c) => compileConnection(c, branch, branchIndex)));
    }
  } else if ((destination as ObjectNode).name === "out") {
    // we have out so we need to find the right inlet to store in
    const subpatch = destination.patch as SubPatch;
    const outletNumber = ((destination as ObjectNode).arguments[0] as number) - 1;
    if (subpatch) {
      const compiledInstructions = subpatch.parentNode.outlets[outletNumber].connections.flatMap(
        (c) => compileConnection(c),
      );
      for (const instruction of compiledInstructions) {
        instructions.push(instruction);
        //pushInstruction(instructions, instruction, branch, branchIndex);
      }
    }
  } else if (isMessageNode(destination) && inletNumber === 1) {
    // message type
    const instruction: Instruction = {
      type: InstructionType.ReplaceMessage,
      node: destination,
      outletNumber,
    };
    //pushInstruction(instructions, instruction, branch, branchIndex);
    instructions.push(instruction);
  } else if (isObjectNode(destination)) {
    // object node
    const instruction: Instruction = {
      type: InstructionType.Store,
      inletNumber,
      inlet: destinationInlet,
      outletNumber,
      node: destination,
    };
    //pushInstruction(instructions, instruction, branch, branchIndex);
    instructions.push(instruction);
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

const getBranchIndex = (node: Node, branch: Branch, log = false) => {
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

export const createInstructions2 = (nodes: Node[]) => {
  const instructions: Instruction[] = [];
  const branchStack: Branch[] = [];
  for (const node of nodes) {
    let branch = peek(branchStack);
    let inBranch = branch && isNodeInBranch(node, branch);
    let newBranch: Branch | undefined = undefined;
    if ((node as ObjectNode).name) {
      // TODO if we are in branch need to find branch index

      if ((node as ObjectNode).branching) {
        // we're at a branch so push new branch onto stack
        newBranch = {
          rootNode: node,
          branches: node.outlets.map(() => []),
        };
        branchStack.push(newBranch);
      }
    }

    while (branch && !inBranch) {
      console.log("while");
      branch = branchStack.pop();
      if (branch && inBranch) {
        const parentBranch = peek(branchStack);
        if (parentBranch && isNodeInBranch(branch.rootNode, parentBranch)) {
          const parentBranchIndex = getBranchIndex(branch.rootNode, parentBranch);
          if (parentBranchIndex > -1) {
            parentBranch.branches[parentBranchIndex].push({
              type: InstructionType.Branch,
              branches: branch.branches,
            });
          }
        } else {
          instructions.push({
            type: InstructionType.Branch,
            branches: branch.branches,
          });
          break;
        }
      }
      inBranch = branch && isNodeInBranch(node, branch);
    }

    const branchIndex = branch && inBranch ? getBranchIndex(node, branch) : -1;

    if ((node as ObjectNode).name || (node as MessageNode).messageType === MessageType.Message) {
      // TODO if we are in branch need to find branch index

      const instruction: Instruction = {
        type: isObjectNode(node) ? InstructionType.EvaluateObject : InstructionType.PipeMessage,
        node,
        loadAtStart: (node as ObjectNode).needsLoad, // tells the evaluator that if we are running some other branch, to skip this
      };

      if ((node as MessageNode).messageType === MessageType.Message) {
        const inbound = getInboundConnections(node.inlets[0]);
        if (inbound[0]) {
          const outletNumber = inbound[0].source.outlets.indexOf(inbound[0].sourceOutlet);
          instruction.outletNumber = outletNumber;
        } else {
          console.log("NO INBOUND!");
        }
      }

      const isBranchingNode = (node as ObjectNode).branching;
      if (branch && inBranch && branchIndex >= 0) {
        branch.branches[branchIndex].push(instruction);
        if (isBranchingNode) {
          const b = peek(branchStack);
          if (b) {
            branch.branches[branchIndex].push({
              type: InstructionType.Branch,
              branches: b.branches,
            });
          }
        }
      } else {
        instructions.push(instruction);
        const b = peek(branchStack);
        if (b) {
          instructions.push({
            type: InstructionType.Branch,
            branches: b.branches,
          });
        }
      }
    }

    // whenever we push into branches we need to keep track of the position of each branch...

    if (node.skipCompilation) {
      continue;
    }

    let outs: { i: number; instruction: Instruction }[] = [];
    for (let i = 0; i < node.outlets.length; i++) {
      const outlet = node.outlets[i];
      const connections = getOutboundConnectionsFromOutlet(outlet, new Set());
      for (const connection of connections) {
        const compiledConnection = compileConnection(connection);
        outs.push(...compiledConnection.map((x) => ({ instruction: x, i })));
      }
    }

    for (const { instruction: out, i } of [
      ...outs.filter(
        (x) =>
          x.instruction.type === InstructionType.Store ||
          x.instruction.type === InstructionType.Attribute ||
          x.instruction.type === InstructionType.ReplaceMessage,
      ),
      ...outs.filter(
        (x) =>
          !(
            x.instruction.type === InstructionType.Store ||
            x.instruction.type === InstructionType.Attribute ||
            x.instruction.type === InstructionType.ReplaceMessage
          ),
      ),
    ]) {
      const index = branchIndex === -1 ? i : branchIndex;
      if (newBranch) {
        const chosenBranch = newBranch.branches[i];
        chosenBranch.push(out);
      } else if (inBranch && branch && index < branch.branches.length) {
        // need to know what branch index to choose by forward traversaing
        const chosenBranch = branch.branches[branchIndex === -1 ? i : branchIndex];
        chosenBranch.push(out);
      } else {
        instructions.push(out);
      }
    }

    /*
    for (let i = 0; i < node.outlets.length; i++) {
      const outlet = node.outlets[i];
      for (const connection of getOutboundConnectionsFromOutlet(outlet, new Set())) {
        const compiledConnection = newBranch
          ? compileConnection(connection, newBranch, i)
          : compileConnection(
              connection,
              branchIndex >= 0 && inBranch ? branch : undefined,
              branchIndex,
            );
        if (inBranch && branch) {
          // need to know what branch index to choose by forward traversaing
          branch.branches[branchIndex === -1 ? i : branchIndex].push(...compiledConnection);
        } else {
          instructions.push(...compiledConnection);
        }
      }
    }
    */
  }

  // NOTE - this is most definitely not the way to do this...
  /*
  while (branchStack.length > 0) {
    const branch = branchStack.pop();
    if (branch) {
      const parentBranch = peek(branchStack);
      if (parentBranch && isNodeInBranch(branch.rootNode, parentBranch)) {
        const parentBranchIndex = getBranchIndex(branch.rootNode, parentBranch, true);
        if (parentBranchIndex >= 0) {
          parentBranch.branches[parentBranchIndex].push({
            type: InstructionType.Branch,
            branches: branch.branches,
          });
        }
      } else {
        instructions.push({
          type: InstructionType.Branch,
          branches: branch.branches,
        });
      }
    }
    // add the branches
  }
  */
  return instructions;
};

interface BranchContext {
  id: number;
  rootNode: Node;
  branches: Instruction[][];
}

const isNodeInBranch2 = (node: Node, branch: Branch, outletIndex: number): boolean => {
  if (node === branch.rootNode) return true;
  const outbound = getOutboundConnectionsFromOutlet(
    branch.rootNode.outlets[outletIndex],
    new Set(),
  );

  for (const { destination } of outbound) {
    const forwardNodes = forwardTraversal(destination);
    if (forwardNodes.includes(node)) {
      return true;
    }
  }
  return false;
};

export const createInstructions = (nodes: Node[]) => {
  console.log("create instructions");
  const instructions: Instruction[] = [];
  const branchStack: BranchContext[] = [];
  let outletIndexStore: number | undefined = undefined;
  let branchId = 0;

  // Calculate outlet index for current node based on its relationship to previous branching node
  const getOutletIndex = (node: Node): number | undefined => {
    if (branchStack.length === 0) return undefined;
    const currentBranch = branchStack[branchStack.length - 1];

    for (let i = 0; i < currentBranch.rootNode.outlets.length; i++) {
      const outlet = currentBranch.rootNode.outlets[i];
      const directConnections = outlet.connections.map((c) => c.destination);
      if (directConnections.includes(node)) {
        return i;
      }
    }
    return undefined;
  };

  const popIfNecessary = (node: Node) => {
    if (branchStack.length === 0) return;
    let currentBranch = branchStack[branchStack.length - 1];

    while (currentBranch && !isNodeInBranch(node, currentBranch)) {
      console.log("whiel...");
      branchStack.pop();
      currentBranch = branchStack[branchStack.length - 1];
    }
  };

  for (const node of nodes) {
    popIfNecessary(node);
    const initialCurrentBranch = branchStack[branchStack.length - 1];
    let _outlet = getOutletIndex(node);
    if (_outlet !== undefined) {
      outletIndexStore = _outlet;
    }
    let outletIndex = outletIndexStore;
    console.log("node.id=%s outletIndex=%s", node.id, outletIndex);

    const isBranchingNode = (node as ObjectNode).branching;

    let branchInstructionToInsert: Instruction | undefined = undefined;
    if (isObjectNode(node) && (node as ObjectNode).branching) {
      const newBranch: BranchContext = {
        id: branchId++,
        rootNode: node,
        branches: node.outlets.map(() => []),
      };

      branchInstructionToInsert = {
        type: InstructionType.Branch,
        branches: newBranch.branches,
        node,
      };

      branchStack.push(newBranch);
    }

    if (isObjectNode(node) || isMessageNode(node, MessageType.Message)) {
      // Handle node evaluation using current outletIndex
      const instruction: Instruction = {
        type: isObjectNode(node) ? InstructionType.EvaluateObject : InstructionType.PipeMessage,
        node,
        loadAtStart: (node as ObjectNode).needsLoad,
      };

      if (isMessageNode(node, MessageType.Message)) {
        const inbound = getInboundConnections(node.inlets[0])[0];
        if (inbound) {
          instruction.outletNumber = inbound.source.outlets.indexOf(inbound.sourceOutlet);
          console.log("outletnumber pipe=", instruction.outletNumber);
        } else {
          console.log("missing outletNumber");
        }
      }

      if (branchStack.length && !(node as ObjectNode).branching && outletIndex !== undefined) {
        branchStack[branchStack.length - 1].branches[outletIndex].push(instruction);
      } else if ((node as ObjectNode).branching && outletIndex !== undefined) {
        const branch = branchStack[branchStack.length - 2];
        if (branch) {
          branch.branches[outletIndex].push(instruction);
        } else {
          instructions.push(instruction);
        }
      } else {
        instructions.push(instruction);
      }

      if (branchInstructionToInsert) {
        if (branchStack.length && outletIndex !== undefined) {
          const currentBranch = initialCurrentBranch || branchStack[branchStack.length - 1];
          console.log(
            "************** inserting branch into current branch root=%s",
            currentBranch.rootNode.id,
            outletIndex,
            node.id,
            branchInstructionToInsert.type,
          );
          currentBranch.branches[outletIndex].push(branchInstructionToInsert);
        } else {
          console.log("inserting branch into root instructions");
          instructions.push(branchInstructionToInsert);
        }
      }
    }

    if (!node.skipCompilation) {
      // Handle connections using same outletIndex
      node.outlets.forEach((outlet, idx) => {
        const connections = getOutboundConnectionsFromOutlet(outlet, new Set());
        const connectionInstructions = connections
          .flatMap((connection) => {
            const compiled = compileConnection(connection);
            if (branchStack.length) {
              const branchIndex = isBranchingNode || outletIndex === undefined ? idx : outletIndex;
              console.log(
                "inserting compiled into branch",
                branchIndex,
                compiled.map((x) => [x.type, x.node?.id]),
              );
              branchStack[branchStack.length - 1].branches[
                isBranchingNode || outletIndex === undefined ? idx : outletIndex
              ].push(...compiled);
              return [];
            }
            return compiled;
          })
          .filter((x) => !!x);

        if (connectionInstructions.length) {
          console.log(
            "inserting into root instructions",
            connectionInstructions.map((y) => [y.node?.id, y.type]),
          );
          instructions.push(...connectionInstructions);
        }
      });
    }
  }

  return instructions;
};
