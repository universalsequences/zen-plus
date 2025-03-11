import { isCompiledType } from "../context";
import { getRootPatch } from "../traverse";
import { getNodesFromInstructions, serializeInstruction } from "./serialization";
import {
  type Node,
  type Patch,
  type IOConnection,
  type ObjectNode,
  type MessageNode,
  type SerializedObjectNode,
  type SerializedMessageNode,
  MessageType,
} from "../types";
import { compileInstructions, isMessageNode, isObjectNode } from "./instructions";
import { getInboundConnections, getOutboundConnections } from "./traversal";
import { NodeInstructions } from "@/workers/core";
import { Statement } from "../definitions/zen/types";
import { PresetManager } from "../definitions/core/preset";

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
  if ((node as ObjectNode).name === "preset") {
    return true;
  }

  if (node.skipCompilation) {
    return false;
  }

  if (isMessageNode(node)) {
    return (
      !node.inlets.some((x) => x.connections.length > 0) &&
      node.outlets.some((y) => y.connections.length > 0)
    );
  }

  // Async nodes must be considered source nodes
  if ((node as ObjectNode).isAsync) {
    return true;
  }

  // UI elements are all source nodes -- i.e. they should be executable via instructions
  if ((node as ObjectNode).needsUX) {
    return true;
  }

  // TODO - all UX elements should be true here (marked as needsLoad)
  if ((node as ObjectNode).needsLoad) {
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
  const instructions = compileInstructions(nodes);
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

export const compileVM = (_patch: Patch, isSubPatch: boolean) => {
  const patch = isSubPatch ? _patch : getRootPatch(_patch);
  const nodeInstructions: NodeInstructions[] = [];
  const allObjects: SerializedObjectNode[] = [];
  const allMessages: SerializedMessageNode[] = [];

  const ogObjects: ObjectNode[] = [];
  const ogMessages: MessageNode[] = [];
  const sourceNodes = getSourceNodesForCompilation(patch);

  for (const sourceNode of sourceNodes) {
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

      const presets = sourceNodes.filter((x) => (x as ObjectNode).name === "preset");
      for (const preset of presets) {
        if ((preset as ObjectNode).custom as PresetManager) {
          ((preset as ObjectNode).custom as PresetManager).notifyVM();
        }
      }
    }, 200);
  }
  if (patch.registerNodes) {
    patch.registerNodes(ogObjects, ogMessages);
  }
};
