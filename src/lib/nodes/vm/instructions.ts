import {
  Node,
  ObjectNode,
  IOConnection,
  IOlet,
  MessageNode,
  SubPatch,
  MessageType,
  Patch,
} from "../types";
import { createAttributeInstruction } from "./attribute";
import {
  forwardTraversal,
  getInboundConnections,
  getOutboundConnectionsFromOutlet,
} from "./traversal";
import { Instruction, InstructionType } from "./types";

export const isMessageNode = (node: Node, messageType?: MessageType) =>
  (messageType !== undefined ? (node as MessageNode).messageType === messageType : true) &&
  (node as MessageNode).messageType !== undefined;

export const isObjectNode = (node: Node) => (node as ObjectNode).name !== undefined;

const compileConnection = (
  connection: IOConnection,
  outletNumber: number,
  patch?: Patch,
): Instruction[] => {
  const instructions: Instruction[] = [];
  const { destinationInlet, source, destination, sourceOutlet } = connection;
  const inletNumber = destination.inlets.indexOf(destinationInlet);

  // handle attribute case
  if (inletNumber === 0) {
    // possible attribute (will later check if the register message is a string of correct form)
    // TODO - if subpatch, then add a list of possible matching nodes for attrbute handling
    const instruction: Instruction = {
      type: InstructionType.Attribute,
      node: destination,
      outletNumber,
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
      const compiledInstructions = connections.flatMap((c) =>
        compileConnection(c, input.outlets.indexOf(c.sourceOutlet), patch),
      );
      for (const instruction of compiledInstructions) {
        instructions.push(instruction);
        //pushInstruction(instructions, instruction, branch, branchIndex);
      }
      //instructions.push(...connections.flatMap((c) => compileConnection(c, branch, branchIndex)));
    }
  } else if ((destination as ObjectNode).name === "out" && destination.patch !== patch) {
    // we have out so we need to find the right inlet to store in
    const subpatch = destination.patch as SubPatch;
    const outletNumber = ((destination as ObjectNode).arguments[0] as number) - 1;
    if (subpatch) {
      const compiledInstructions = subpatch.parentNode.outlets[outletNumber].connections.flatMap(
        (c) => compileConnection(c, outletNumber, patch),
      );
      for (const instruction of compiledInstructions) {
        instructions.push(instruction);
        //pushInstruction(instructions, instruction, branch, branchIndex);
      }
    }
  } else if (isMessageNode(destination) && inletNumber === 1) {
    const instruction: Instruction = {
      type: InstructionType.ReplaceMessage,
      node: destination,
      outletNumber,
    };
    //pushInstruction(instructions, instruction, branch, branchIndex);
    instructions.push(instruction);
  } //else if (isObjectNode(destination)) {
  // object node
  if ((isMessageNode(destination) && inletNumber === 0) || isObjectNode(destination)) {
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
  //}

  return instructions;
};

interface Branch {
  rootNode: Node;
  branches: Instruction[][];
}

interface BranchContext {
  id: number;
  rootNode: Node;
  branches: Instruction[][];
  outletIndexStore?: number;
}

/**
 * compiles a list of topologically sorted nodes into a list of instructions that can be executed in a virtual machine
 * */
export const compileInstructions = (nodes: Node[], patch?: Patch) => {
  const isNodeInBranch = (node: Node, branch: Branch): boolean => {
    if (node === branch.rootNode) return true;
    const forwardNodes = forwardTraversal(branch.rootNode, undefined, true);
    return forwardNodes.includes(node);
  };

  const instructions: Instruction[] = [];
  const branchStack: BranchContext[] = [];
  let branchId = 0;

  // Calculate outlet index for current node based on its relationship to previous branching node
  const getOutletIndex = (node: Node): number | undefined => {
    if (branchStack.length === 0) return undefined;
    const currentBranch = branchStack[branchStack.length - 1];

    // TODO ***** !!!!!!! this needs to not just use direct connections!!!!!!
    for (let i = 0; i < currentBranch.rootNode.outlets.length; i++) {
      const outlet = currentBranch.rootNode.outlets[i];
      const connections = getOutboundConnectionsFromOutlet(outlet, new Set(), patch);
      if (connections.map((x) => x.destination).includes(node)) {
        return i;
      }
    }
    return undefined;
  };

  // pops the current branch if neceessary
  const popIfNecessary = (node: Node) => {
    if (branchStack.length === 0) return;
    let currentBranch = branchStack[branchStack.length - 1];

    // TODO - if branch is consumed (i.e. we have no more ), we must pop
    // by checking if the node if the current node is no longer in the branch, we can say that
    // we have consumed that branch

    const inBranch = currentBranch && isNodeInBranch(node, currentBranch);
    while (currentBranch && !isNodeInBranch(node, currentBranch)) {
      const b = branchStack.pop();
      currentBranch = branchStack[branchStack.length - 1];
    }
  };

  const pushInstructionIntoBranchOrRoot = (
    instruction: Instruction,
    node: Node,
    outletIndex: number | undefined,
  ) => {
    if (
      branchStack.length &&
      !(node as ObjectNode).branching &&
      outletIndex !== undefined &&
      branchStack[branchStack.length - 1].branches[outletIndex]
    ) {
      branchStack[branchStack.length - 1].branches[outletIndex].push(instruction);
    } else if ((node as ObjectNode).branching && outletIndex !== undefined) {
      const branch = branchStack[branchStack.length - 2];
      if (branch?.branches?.[outletIndex]) {
        branch.branches[outletIndex].push(instruction);
      } else {
        instructions.push(instruction);
      }
    } else {
      instructions.push(instruction);
    }
  };

  for (const node of nodes) {
    popIfNecessary(node);
    const initialCurrentBranch = branchStack[branchStack.length - 1];
    let _outlet = getOutletIndex(node);
    let outletIndexStore = branchStack[branchStack.length - 1]?.outletIndexStore;
    if (_outlet !== undefined) {
      outletIndexStore = _outlet;
      branchStack[branchStack.length - 1].outletIndexStore = _outlet;
    }
    let outletIndex = outletIndexStore;

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

      const name = (node as ObjectNode).name;
      if (isObjectNode(node) && (name === "send" || name === "s")) {
        if (node.attributes.scope === "subtree") {
          // we need to find all nodes that match this
          const key = (node as ObjectNode).arguments[0];
          instruction.nodes = node.patch
            .getAllNodes()
            .filter((x) => x.name === "subscribe" || x.name === "r")
            .filter((x) => (x as ObjectNode).arguments[0] === key);
        }
      }

      if (isMessageNode(node, MessageType.Message)) {
        const inbound = getInboundConnections(node.inlets[0])[0];
        if (inbound) {
          instruction.outletNumber = inbound.source.outlets.indexOf(inbound.sourceOutlet);
        } else {
          //console.log("missing outletNumber", instruction, node);
        }
      }

      pushInstructionIntoBranchOrRoot(instruction, node, outletIndex);

      // handle the branch instruction (if needed)
      if (branchInstructionToInsert) {
        const currentBranch = initialCurrentBranch || branchStack[branchStack.length - 1];
        if (
          branchStack.length &&
          outletIndex !== undefined &&
          currentBranch.rootNode?.id !== branchInstructionToInsert.node?.id
        ) {
          currentBranch.branches[outletIndex].push(branchInstructionToInsert);
        } else {
          instructions.push(branchInstructionToInsert);
        }
      }
    }

    if (!node.skipCompilation) {
      // Handle connections using same outletIndex
      node.outlets.forEach((outlet, idx) => {
        const immediateSubPatchConnections = outlet.connections.filter(
          (x) => !!(x.destination as ObjectNode).subpatch,
        );

        for (const connection of immediateSubPatchConnections) {
          const instruction = createAttributeInstruction(connection.destination as ObjectNode, idx);
          pushInstructionIntoBranchOrRoot(
            instruction,
            node,
            isBranchingNode || outletIndex === undefined ? idx : outletIndex,
          );
          instructions.push(instruction);
        }

        const connections = getOutboundConnectionsFromOutlet(outlet, new Set(), patch);
        const connectionInstructionsToPushIntoRoot = connections
          .flatMap((connection) => {
            const outletNumber = node.outlets.indexOf(outlet);
            const compiled = compileConnection(connection, outletNumber, patch);
            if (branchStack.length) {
              // if we're in a branch we handle pushing it directly into the branch here
              const branch =
                branchStack[branchStack.length - 1].branches[
                  isBranchingNode || outletIndex === undefined ? idx : outletIndex
                ];
              if (branch) {
                branch.push(...compiled);
                return [];
              }
            }
            return compiled;
          })
          .filter((x) => !!x);

        if (connectionInstructionsToPushIntoRoot.length) {
          instructions.push(...connectionInstructionsToPushIntoRoot);
        }
      });
    }
  }

  return instructions;
};
