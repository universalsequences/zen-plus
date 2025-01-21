import { isCompiledType } from "../context";
import { getRootPatch } from "../traverse";
import type { Node, Patch, IOConnection, ObjectNode, SubPatch, MessageNode, IOlet } from "../types";
import { createInstructions } from "./instructions";
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

export const topologicalSearchFromNode = (node: Node, debug = false): Node[] => {
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
      const connections = getOutboundConnections(n, visitedConnections);
      for (const m of connections) {
        visitedConnections.add(m);
        const { destination, destinationInlet } = m;
        const inletNumber = destination.inlets.indexOf(destinationInlet);
        const isMessage = (destination as MessageNode).messageType !== undefined;
        //if ((destination as ObjectNode).skipCompilation) {
        //  continue;
        if (isMessage && inletNumber === 1) {
          continue;
        } else if (destinationInlet.isHot) {
          const inbound = destination.inlets
            .flatMap((x) => getInboundConnections(x))
            .filter((x) => !visitedConnections.has(x));
          if (!S.includes(destination)) {
            S.push(destination);
          }
        }
      }
    }
  }
  return L;
};

const isSourceNode = (node: Node) => {
  if ((node as MessageNode).messageType !== undefined) {
    return (
      !node.inlets.some((x) => x.connections.length > 0) &&
      node.outlets.some((y) => y.connections.length > 0)
    );
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
  const instructions = createInstructions(nodes);
  node.instructions = instructions;
  //console.log("instructions for node=", node, instructions);
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
  }

  const sourceNodes: Node[] = allNodes.filter((x) => isSourceNode(x));

  return sourceNodes;
};

export const compileVM = (patch: Patch) => {
  for (const sourceNode of getSourceNodesForCompilation(getRootPatch(patch))) {
    compileSourceNode(sourceNode);
  }
};
