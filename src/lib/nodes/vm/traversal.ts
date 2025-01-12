import { IOConnection, ObjectNode, SubPatch, Node } from "../types";

export const getOutboundConnections = (
  n: Node,
  visitedConnections: Set<IOConnection>,
): IOConnection[] => {
  const rawConnections = n.outlets.flatMap((x) => x.connections);

  const connections = rawConnections.filter((x) => !visitedConnections.has(x));

  const subpatchConnections: IOConnection[] = [];
  const regularConnections: IOConnection[] = [];
  const outConnections: IOConnection[] = [];
  for (const c of connections) {
    const name = (c.destination as ObjectNode).name;
    if ((c.destination as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if (name === "out") {
      outConnections.push(c);
    } else {
      regularConnections.push(c);
    }
  }

  const resolvedSubpatchConnections: IOConnection[] = [];
  for (const connection of subpatchConnections) {
    const { destination, destinationInlet } = connection;
    const inletNumber = destination.inlets.indexOf(destinationInlet) + 1;

    const subpatch = (destination as ObjectNode).subpatch as SubPatch;
    const input = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber,
    );

    if (input) {
      resolvedSubpatchConnections.push(...input.outlets.flatMap((outlet) => outlet.connections));
    }
  }

  for (const connection of outConnections) {
    const { destination } = connection;
    const patch = destination.patch;
    const outletNumber = ((destination as ObjectNode).arguments[0] as number) - 1;
    const outlet = (patch as SubPatch).parentNode.outlets[outletNumber];

    if (outlet) {
      resolvedSubpatchConnections.push(...outlet.connections);
    }
  }

  const ret = [...regularConnections, ...resolvedSubpatchConnections].filter(
    (x) => !visitedConnections.has(x),
  );
  return ret;
};

export const forwardTraversal = (node: Node, visited = new Set<Node>()): Node[] => {
  if (visited.has(node)) return [];
  visited.add(node);
  const outbound = getOutboundConnections(node, new Set<IOConnection>());
  return [node, ...outbound.flatMap((c) => forwardTraversal(c.destination, visited))];
};
