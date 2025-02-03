import { isCompiledType } from "../context";
import { getRootPatch } from "../traverse";
import {
  type Node,
  type Patch,
  type IOConnection,
  type ObjectNode,
  type SubPatch,
  type MessageNode,
  type SerializedObjectNode,
  type SerializedMessageNode,
  MessageType,
} from "../types";
import { createInstructions, isMessageNode, isObjectNode } from "./instructions";
import { Instruction, InstructionType, SerializedInstruction } from "./types";
import { getInboundConnections, getOutboundConnections } from "./traversal";
import { NodeInstructions } from "@/workers/core";
import { Statement } from "../definitions/zen/types";

export const topologicalSearchFromNode3 = (
  node: Node,
  visitedConnections = new Set<IOConnection>(),
): Node[] => {
  const connections = getOutboundConnections(node, new Set());
  const nodes: Node[] = [node];
  if (node.skipCompilation) {
    return nodes;
  }
  for (const conn of connections) {
    const { destination, destinationInlet } = conn;
    const inletNumber = destination.inlets.indexOf(destinationInlet);
    const isMessage = isMessageNode(destination);

    if (isMessage && inletNumber === 1) continue;

    if (destinationInlet.isHot || (isMessage && inletNumber === 0)) {
      const inbound = destination.inlets.flatMap((inlet) => getInboundConnections(inlet));
      if (!inbound.every((c) => visitedConnections.has(c))) {
        visitedConnections.add(conn);
        nodes.push(...topologicalSearchFromNode3(destination, visitedConnections));
      }
    }
  }

  return nodes;
};

export const topologicalSearchFromNode = (node: Node): Node[] => {
  const stack = [node];
  const result: Node[] = [];
  const visitedConnections = new Set<IOConnection>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);

    if (current.skipCompilation || isCompiledType((current as ObjectNode).operatorContextType)) {
      continue;
    }

    const connections = getOutboundConnections(current, new Set()).reverse();
    for (const conn of connections) {
      const { destination, destinationInlet } = conn;
      const inletNumber = destination.inlets.indexOf(destinationInlet);
      const isMessage = isMessageNode(destination);

      if (isMessage && inletNumber === 1) continue;

      if (destinationInlet.isHot || (isMessage && inletNumber === 0)) {
        const inbound = destination.inlets.flatMap((inlet) => getInboundConnections(inlet));
        if (!inbound.every((c) => visitedConnections.has(c))) {
          stack.push(destination);
        }
      }
      visitedConnections.add(conn);
    }
  }

  return result;
};

const isSourceNode = (node: Node) => {
  if (node.skipCompilation) {
    return false;
  }

  // TODO - we need to figure out compiling nodes in compileable patches (that are not
  // part of the actual zen/gl graph)
  /*
  if (isCompiledType((node.patch as SubPatch).patchType)) {
    if (
      !isCompiledType((node as ObjectNode).operatorContextType) &&
      node.inlets.some((x) => x.connections.some((y) => (y.source as ObjectNode).name === "in"))
    ) {
    } else {
      return false;
    }
  }
  */

  if (isMessageNode(node)) {
    return (
      !node.inlets.some((x) => x.connections.length > 0) &&
      node.outlets.some((y) => y.connections.length > 0)
    );
  }

  if ((node as ObjectNode).isAsync) {
    return true;
  }

  if ((node as ObjectNode).name === "matrix" || (node as ObjectNode).name === "zequencer.core") {
    return true;
  }

  if (
    !node.inlets.some((x) => x.connections.length > 0) &&
    node.outlets.some((x) => x.connections.length > 0) &&
    !(node as ObjectNode).needsMainThread
  ) {
    return true;
  }

  for (const inlet of node.inlets) {
    const connections = getInboundConnections(inlet);
    if (
      connections.some(
        (c) =>
          c.source.skipCompilation ||
          ((c.source as ObjectNode).name !== "attrui" && (c.source as ObjectNode).needsLoad),
      )
    ) {
      return true;
    }
  }
  return false;
};

const compileSourceNode = (node: Node) => {
  const nodes = topologicalSearchFromNode(node);
  const offset = (node as ObjectNode).isAsync ? 1 : 0;
  const instructions = createInstructions(nodes);
  node.instructions = instructions.slice(offset);
  for (let i = 0; i < nodes.length; i++) {
    const _node = nodes[i];
    if (!_node.debugTopologicalIndex) {
      _node.debugTopologicalIndex = {};
    }
    if (_node.debugTopologicalIndex) {
      _node.debugTopologicalIndex[node.id] = i;
    }
  }
};

export const getSourceNodesForCompilation = (patch: Patch): Node[] => {
  const allNodes = [...patch.getAllNodes(), ...patch.getAllMessageNodes()].filter((x) => {
    let name = (x as ObjectNode).name;
    if (name === "in" || name === "out" || (x as ObjectNode).subpatch) {
      return false;
    }
    return true;
  });
  for (const node of allNodes) {
    node.instructions = undefined;
    node.debugInstructions = undefined;
    node.debugTopologicalIndex = undefined;
  }

  const sourceNodes: Node[] = allNodes.filter((x) => isSourceNode(x));

  return sourceNodes;
};

export const compileVM = (_patch: Patch) => {
  const patch = getRootPatch(_patch);
  console.log("compile vm called...");
  const nodeInstructions: NodeInstructions[] = [];
  const allObjects: SerializedObjectNode[] = [];
  const allMessages: SerializedMessageNode[] = [];

  const ogObjects: ObjectNode[] = [];
  const ogMessages: MessageNode[] = [];
  for (const sourceNode of getSourceNodesForCompilation(patch)) {
    compileSourceNode(sourceNode);
    if (sourceNode.instructions) {
      const serializedInstructions = sourceNode.instructions.map(serializeInstruction);
      const nodes = getNodesFromInstructions(sourceNode.instructions);
      const objects = nodes.filter((x) => isObjectNode(x)) as ObjectNode[];
      if ((sourceNode as ObjectNode).isAsync) {
        objects.push(sourceNode as ObjectNode);
      }
      const serializedObjects = objects.map((x) => (x as ObjectNode).getJSON());
      const messages = nodes.filter((x) => isMessageNode(x)) as MessageNode[];
      if ((sourceNode as MessageNode).messageType === MessageType.Number) {
        messages.push(sourceNode as MessageNode);
      }
      const serializedMessages = messages.map((x) => (x as MessageNode).getJSON());
      ogObjects.push(...objects);
      ogMessages.push(...messages);

      for (const o of serializedObjects) {
        if (!allObjects.includes(o)) {
          allObjects.push(o);
        }
      }

      for (const m of serializedMessages) {
        if (!allMessages.includes(m)) {
          if ((m.message as Statement)?.node) {
            m.message = "";
          }
          allMessages.push(m);
        }
      }
      nodeInstructions.push({
        nodeId: sourceNode.id,
        instructions: serializedInstructions,
      });
    }
  }
  if (patch.sendWorkerMessage) {
    patch.sendWorkerMessage({
      type: "setCompilation",
      body: {
        objects: allObjects,
        messages: allMessages,
        nodeInstructions,
      },
    });

    // TODO - ack from worker and then do this
    setTimeout(() => {
      patch.sendWorkerMessage?.({
        type: "loadbang",
      });
    }, 200);
  }
  if (patch.registerNodes) {
    patch.registerNodes(ogObjects, ogMessages);
  }
};

const serializeInstruction = (instruction: Instruction): SerializedInstruction => {
  const node = instruction.node?.id;
  let branches: SerializedInstruction[][] | undefined;
  if (instruction.branches) {
    branches = [];
    for (const branch of instruction.branches) {
      const serializedBranch: SerializedInstruction[] = [];
      for (const branchInstruction of branch) {
        serializedBranch.push(serializeInstruction(branchInstruction));
      }
      branches.push(serializedBranch);
    }
    return {
      type: InstructionType.Branch,
      branches,
      node,
    };
  }
  return {
    type: instruction.type as Exclude<InstructionType, InstructionType.Branch>,
    node,
    inletNumber: instruction.inletNumber,
    outletNumber: instruction.outletNumber,
    nodes: instruction.nodes?.map((x) => x.id),
  };
};

const getNodesFromInstructions = (instructions: Instruction[]): Node[] => {
  const nodes = new Set<Node>();

  for (const instruction of instructions) {
    if (instruction.node) {
      nodes.add(instruction.node);
    }
    if (instruction.nodes) {
      for (const node of instruction.nodes) {
        nodes.add(node);
      }
    }
    if (instruction.branches) {
      for (const branch of instruction.branches) {
        const branchNodes = getNodesFromInstructions(branch);
        for (const n of branchNodes) {
          nodes.add(n);
        }
      }
    }
  }
  return Array.from(nodes);
};
