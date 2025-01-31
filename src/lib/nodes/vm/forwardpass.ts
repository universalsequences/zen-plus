import { isCompiledType } from "../context";
import { getRootPatch } from "../traverse";
import type {
  Node,
  Patch,
  IOConnection,
  ObjectNode,
  SubPatch,
  MessageNode,
  IOlet,
  SerializedObjectNode,
  SerializedMessageNode,
} from "../types";
import { createInstructions, isMessageNode, isObjectNode } from "./instructions";
import { Instruction, InstructionType, SerializedInstruction } from "./types";
import {
  type CompilationPath,
  isSubpath,
  splitPath,
  mergePaths,
  printPaths,
  splitPathByNonCompilableNodes,
  printNodes,
} from "./paths";
import { getInboundConnections, getOutboundConnections } from "./traversal";
import { NodeInstructions } from "@/workers/core";

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

export const topologicalSearchFromNode2 = (node: Node, debug = false): Node[] => {
  let S = [node];
  let L: Node[] = [];
  const visitedConnections: Set<IOConnection> = new Set();

  while (S.length > 0) {
    const n = S.pop();
    if (n) {
      L.push(n);
      if (n.skipCompilation || isCompiledType((n as ObjectNode).operatorContextType)) {
        continue;
      }
      // NOTE: we need to determine if theres a cycle and if so ensure that we don't keep looping
      const connections = getOutboundConnections(n, new Set());
      for (const m of connections) {
        const { destination, destinationInlet } = m;
        const inletNumber = destination.inlets.indexOf(destinationInlet);
        const isMessage = (destination as MessageNode).messageType !== undefined;
        if (isMessage && inletNumber === 1) {
          continue;
        } else if (destinationInlet.isHot || (isMessage && inletNumber === 0)) {
          const inbound = destination.inlets.flatMap((inlet) => getInboundConnections(inlet));
          if (!inbound.every((c) => visitedConnections.has(c))) {
            S.push(destination);
          }
        }
        visitedConnections.add(m);
      }
    }
  }
  return L;
};

const isSourceNode = (node: Node) => {
  // TODO - we need to figure out compiling nodes in compileable patches (that are not
  // part of the actual zen/gl graph)
  if (isCompiledType((node.patch as SubPatch).patchType)) {
    if (
      !isCompiledType((node as ObjectNode).operatorContextType) &&
      node.inlets.some((x) => x.connections.some((y) => (y.source as ObjectNode).name === "in"))
    ) {
    } else {
      return false;
    }
  }
  if (isMessageNode(node)) {
    return (
      !node.inlets.some((x) => x.connections.length > 0) &&
      node.outlets.some((y) => y.connections.length > 0)
    );
  }

  if ((node as ObjectNode).isAsync) {
    return true;
  }

  if (
    !node.inlets.some((x) => x.connections.length > 0) &&
    node.outlets.some((x) => x.connections.length > 0) &&
    (!(node as ObjectNode).needsLoad || (node as ObjectNode).name === "attrui")
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
  const instructions = createInstructions(nodes.slice(offset));
  node.instructions = instructions;
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
      const serializedObjects = objects.map((x) => (x as ObjectNode).getJSON());
      const messages = nodes.filter((x) => isMessageNode(x)) as MessageNode[];
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
    console.log("sending dat shit");
    patch.sendWorkerMessage({
      type: "setCompilation",
      body: {
        objects: allObjects,
        messages: allMessages,
        nodeInstructions,
      },
    });
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
  };
};

const getNodesFromInstructions = (instructions: Instruction[]): Node[] => {
  const nodes = new Set<Node>();

  for (const instruction of instructions) {
    if (instruction.node) {
      nodes.add(instruction.node);
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
