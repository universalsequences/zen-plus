import { IOConnection, ObjectNode, SubPatch, Node, IOlet } from "../types";

export const getOutboundConnections = (
  n: Node,
  visitedConnections: Set<IOConnection>,
): IOConnection[] => {
  return n.outlets.flatMap((x) => getOutboundConnectionsFromOutlet(x, visitedConnections));
};

export const getOutboundConnectionsFromOutlet = (
  outlet: IOlet,
  visitedConnections: Set<IOConnection>,
): IOConnection[] => {
  const rawConnections = outlet.connections;

  const connections = rawConnections.filter((x) => !visitedConnections.has(x));

  const subpatchConnections: IOConnection[] = [];
  const regularConnections: IOConnection[] = [];
  const outConnections: IOConnection[] = [];
  for (const c of connections) {
    const name = (c.destination as ObjectNode).name;
    if ((c.destination as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if (name === "out" || name === "patchmessage") {
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
      resolvedSubpatchConnections.push(
        ...input.outlets.flatMap((outlet) =>
          getOutboundConnectionsFromOutlet(outlet, visitedConnections),
        ),
      );
    }
  }

  for (const connection of outConnections) {
    const { destination } = connection;
    const patch = destination.patch;
    const outletNumber =
      (destination as ObjectNode).name === "patchmessage"
        ? 0
        : ((destination as ObjectNode).arguments[0] as number) - 1;
    const outlet = (patch as SubPatch).parentNode.outlets[outletNumber];

    if (outlet) {
      resolvedSubpatchConnections.push(
        ...getOutboundConnectionsFromOutlet(outlet, visitedConnections),
      );
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

export const getInboundConnections = (inlet: IOlet, debug = false): IOConnection[] => {
  const connections = inlet.connections;
  const subpatchConnections: IOConnection[] = [];
  const regularConnections: IOConnection[] = [];
  const inConnections: IOConnection[] = [];
  for (const c of connections) {
    if ((c.source as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if ((c.source as ObjectNode).name === "in") {
      inConnections.push(c);
    } else {
      regularConnections.push(c);
    }
  }

  const resolvedSubpatchConnections: IOConnection[] = [];
  for (const connection of subpatchConnections) {
    const { source, sourceOutlet } = connection;
    const outletNumber = source.outlets.indexOf(sourceOutlet) + 1;

    const subpatch = (source as ObjectNode).subpatch as SubPatch;
    const out = subpatch.objectNodes.find(
      (x) =>
        (outletNumber === 1 && x.name === "patchmessage") ||
        (x.name === "out" && x.arguments[0] === outletNumber),
    );

    if (out) {
      resolvedSubpatchConnections.push(
        ...out.inlets.flatMap((inlet) => getInboundConnections(inlet)),
      );
    }
  }

  for (const connection of inConnections) {
    const { source } = connection;
    const patch = source.patch;
    const inletNumber = ((source as ObjectNode).arguments[0] as number) - 1;
    const inlet = (patch as SubPatch).parentNode.inlets[inletNumber];
    if (inlet) {
      const c = getInboundConnections(inlet, true);
      resolvedSubpatchConnections.push(...c);
    }
  }

  return [...regularConnections, ...resolvedSubpatchConnections];
};

export const backtrack = (node: Node, L: Node[]) => {
  const L2: Node[] = [node];

  for (const inlet of node.inlets) {
    if (!inlet.isHot) {
      continue;
    }
    const inbound = getInboundConnections(inlet);
    for (const connection of inbound) {
      const { source } = connection;
      if (L.includes(source)) {
        L2.push(...backtrack(source, L));
      }
    }
  }
  return L.filter((x) => L2.includes(x));
};
