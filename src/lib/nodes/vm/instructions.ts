import { Node, ObjectNode, IOConnection, MessageNode, SubPatch, MessageType } from "../types";
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

const compileConnection = (connection: IOConnection): Instruction[] => {
  const instructions: Instruction[] = [];
  const { destinationInlet, source, destination, sourceOutlet } = connection;
  const inletNumber = destination.inlets.indexOf(destinationInlet);
  const inbound = getInboundConnections(sourceOutlet);
  if (!inbound[0]) {
    console.log("no inbound on source outlet=", sourceOutlet);
  }
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

interface BranchContext {
  id: number;
  rootNode: Node;
  branches: Instruction[][];
}

export const createInstructions = (nodes: Node[]) => {
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
      const b = branchStack.pop();
      currentBranch = branchStack[branchStack.length - 1];
      console.log(
        "popping branch=%s currentBranch=%s",
        b.rootNode?.text,
        currentBranch?.rootNode?.text,
      );
    }
  };

  for (const node of nodes) {
    console.log("processing node *********** ", node.text);
    popIfNecessary(node);
    const initialCurrentBranch = branchStack[branchStack.length - 1];
    let _outlet = getOutletIndex(node);
    console.log("outlet index for node=%s index=%s", node.text, _outlet);
    if (_outlet !== undefined) {
      outletIndexStore = _outlet;
    }
    console.log("outlet index for node=%s post-store index=%s", node.text, outletIndexStore);
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
      console.log("handling object node...", node.text);
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
        } else {
          console.log("missing outletNumber");
        }
      }

      if (
        branchStack.length &&
        !(node as ObjectNode).branching &&
        outletIndex !== undefined &&
        branchStack[branchStack.length - 1].branches[outletIndex]
      ) {
        branchStack[branchStack.length - 1].branches[outletIndex].push(instruction);
        console.log(
          "insterting instruction into  branch[%s]=",
          outletIndex,
          branchStack[branchStack.length - 1].rootNode.text,
          instruction.node?.text,
        );
      } else if ((node as ObjectNode).branching && outletIndex !== undefined) {
        const branch = branchStack[branchStack.length - 2];
        if (branch) {
          branch.branches[outletIndex].push(instruction);
          console.log(
            "insterting instruction into branch=",
            branch.rootNode.text,
            instruction.node?.text,
          );
        } else {
          instructions.push(instruction);
          console.log("insterting instruction into root=", instruction.node?.text);
        }
      } else {
        instructions.push(instruction);
        console.log("insterting instruction into root=", instruction.node?.text);
      }

      if (branchInstructionToInsert) {
        const currentBranch = initialCurrentBranch || branchStack[branchStack.length - 1];
        if (
          branchStack.length &&
          outletIndex !== undefined &&
          currentBranch.rootNode?.id !== branchInstructionToInsert.node?.id
        ) {
          currentBranch.branches[outletIndex].push(branchInstructionToInsert);
          console.log(
            "inserting branchinstruction=%s in other branch[%s]",
            branchInstructionToInsert.node?.text,
            outletIndex,
            currentBranch?.rootNode?.text,
          );
        } else {
          instructions.push(branchInstructionToInsert);
          console.log(
            "inserting branchinstruction=%s in root",
            branchInstructionToInsert.node?.text,
          );
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
          instructions.push(instruction);
        }

        const connections = getOutboundConnectionsFromOutlet(outlet, new Set());
        const connectionInstructions = connections
          .flatMap((connection) => {
            const compiled = compileConnection(connection);
            if (branchStack.length) {
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

        if (connectionInstructions.length) {
          instructions.push(...connectionInstructions);
        }
      });
    }
  }

  return instructions;
};
