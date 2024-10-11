import type { Node, ObjectNode, Patch, SubPatch, IOConnection } from "./types";

export const getRootPatch = (patch: Patch) => {
  let root = patch;
  while ((root as SubPatch).parentPatch) {
    root = (root as SubPatch).parentPatch;
  }
  return root;
};

const expandConnections = (connection: IOConnection): IOConnection[] => {
  const { destination, destinationInlet } = connection;

  const subpatch = (destination as ObjectNode).subpatch;
  if (subpatch) {
    const inletNumber = destination.inlets.indexOf(connection.destinationInlet);
    const inObject = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber + 1,
    );
    if (inObject?.outlets[0]) {
      return inObject.outlets[0].connections;
    }
  }

  // if its an out inside a subpatch we need to find that outlets connections
  if ((destination as ObjectNode).name === "out") {
    const patch = destination.patch;
    const subpatchNode = (patch as SubPatch).parentNode;
    if (subpatchNode) {
      // then we are
      if (patch.isZenBase()) {
        return [];
      }
      const outletNumber = (destination as ObjectNode).arguments[0] as number;
      const outlet = subpatchNode.outlets[outletNumber - 1];
      if (outlet) {
        let c1: IOConnection[] = [];
        for (const connection of outlet.connections) {
          const c2 = expandConnections(connection);
          c1 = [...c1, ...c2];
        }
        return c1;
      }
    }
  }
  return [connection];
};

export const isForwardCycle = (
  node: Node,
  originalNode: Node = node,
  visited: Set<Node> = new Set<Node>(),
): boolean => {
  const ins: Node[] = [node];
  visited.add(node);
  for (const outlet of node.outlets) {
    const _connections = outlet.connections.flatMap((x) => expandConnections(x));
    for (const connection of _connections) {
      const { destination } = connection;

      if (destination === originalNode) {
        return true;
      }
      if (visited.has(destination)) {
        continue;
      }
      if (isForwardCycle(destination, originalNode, visited)) {
        return true;
      }
    }
  }
  return false;
};

export const traverseBackwards = (node: Node, visited: Set<Node> = new Set<Node>()): Node[] => {
  if (visited.has(node)) {
    return [];
  }
  let ins: Node[] = [node];
  visited.add(node);
  for (const inlet of node.inlets) {
    for (const connection of inlet.connections) {
      const { source } = connection;
      const subpatch = (source as ObjectNode).subpatch;
      if (subpatch) {
        ins = [...ins, ...traverseBackwards(source, visited), ...subpatch.getAllNodes()];
      } else {
        ins = [...ins, ...traverseBackwards(source, visited)];
      }
    }
  }
  return ins;
};

export const traverseForwards = (
  node: Node,
  originalNode: Node = node,
  visited: Set<Node> = new Set<Node>(),
  debug = false,
): Node[] => {
  let ins: Node[] = [node];
  visited.add(node);
  for (const outlet of node.outlets) {
    const _connections = outlet.connections.flatMap((x) => expandConnections(x));
    for (const connection of _connections) {
      const { destination } = connection;

      if (destination === originalNode) {
        continue;
      }
      if (visited.has(destination)) {
        continue;
      }
      ins = [...ins, destination, ...traverseForwards(destination, originalNode, visited, debug)];
    }
  }
  return ins;
};
