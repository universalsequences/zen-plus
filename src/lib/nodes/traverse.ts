import type { Node, ObjectNode, Patch, SubPatch, IOConnection } from "./types";

export const getRootPatch = (patch: Patch) => {
  let root = patch;
  while ((root as SubPatch).parentPatch) {
    root = (root as SubPatch).parentPatch;
  }
  return root;
};

const expandConnections = (connection: IOConnection): IOConnection[] => {
  let { destination, destinationInlet } = connection;

  let subpatch = (destination as ObjectNode).subpatch;
  if (subpatch) {
    let inletNumber = destination.inlets.indexOf(connection.destinationInlet);
    let inObject = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber + 1,
    );
    if (inObject && inObject.outlets[0]) {
      return inObject.outlets[0].connections;
    }
  }

  // if its an out inside a subpatch we need to find that outlets connections
  if ((destination as ObjectNode).name === "out") {
    let patch = destination.patch;
    let subpatchNode = (patch as SubPatch).parentNode;
    if (subpatchNode) {
      // then we are
      let outletNumber = (destination as ObjectNode).arguments[0] as number;
      let outlet = subpatchNode.outlets[outletNumber - 1];
      if (outlet) {
        let c1: IOConnection[] = [];
        for (let connection of outlet.connections) {
          let c2 = expandConnections(connection);
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
  let ins: Node[] = [node];
  visited.add(node);
  for (let outlet of node.outlets) {
    let _connections = outlet.connections.flatMap((x) => expandConnections(x));
    for (let connection of _connections) {
      let { destination } = connection;

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

export const traverseBackwards = (
  node: Node,
  visited: Set<Node> = new Set<Node>(),
): Node[] => {
  if (visited.has(node)) {
    return [];
  }
  let ins: Node[] = [node];
  visited.add(node);
  for (let inlet of node.inlets) {
    for (let connection of inlet.connections) {
      let { source } = connection;
      let subpatch = (source as ObjectNode).subpatch;
      if (subpatch) {
        ins = [
          ...ins,
          ...traverseBackwards(source, visited),
          ...subpatch.getAllNodes(),
        ];
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
  for (let outlet of node.outlets) {
    let _connections = outlet.connections.flatMap((x) => expandConnections(x));
    for (let connection of _connections) {
      let { destination } = connection;

      if (destination === originalNode) {
        continue;
      }
      if (visited.has(destination)) {
        continue;
      }
      ins = [
        ...ins,
        destination,
        ...traverseForwards(destination, originalNode, visited, debug),
      ];
    }
  }
  return ins;
};
