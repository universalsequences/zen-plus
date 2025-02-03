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
  const slotConnections: IOConnection[] = [];
  for (const c of connections) {
    const name = (c.destination as ObjectNode).name;
    if ((c.destination as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if (name === "out" || name === "patchmessage") {
      outConnections.push(c);
    } else if (name === "slots~") {
      slotConnections.push(c);
    } else {
      regularConnections.push(c);
    }
  }

  const resolvedSubpatchConnections: IOConnection[] = [];

  const handleInput = (input: ObjectNode | undefined) => {
    if (input) {
      resolvedSubpatchConnections.push(
        ...input.outlets.flatMap((outlet) =>
          getOutboundConnectionsFromOutlet(outlet, visitedConnections),
        ),
      );
    }
  };

  for (const connection of slotConnections) {
    const { destination } = connection;
    const slots = (destination as ObjectNode).slots;
    if (slots) {
      const slot = slots[0];
      const subpatch = slot.subpatch;
      const input = subpatch?.objectNodes.find((x) => x.name === "in" && x.arguments[0] === 1);
      handleInput(input);
    }
  }
  for (const connection of subpatchConnections) {
    const { destination, destinationInlet } = connection;
    const inletNumber = destination.inlets.indexOf(destinationInlet) + 1;

    const subpatch = (destination as ObjectNode).subpatch as SubPatch;
    const input = subpatch.objectNodes.find(
      (x) => x.name === "in" && x.arguments[0] === inletNumber,
    );
    handleInput(input);
  }

  for (const connection of outConnections) {
    // TODO - handle slots case
    const { destination } = connection;
    const patch = destination.patch;
    const outletNumber =
      (destination as ObjectNode).name === "patchmessage"
        ? 0
        : ((destination as ObjectNode).arguments[0] as number) - 1;

    if (patch.slotsNode?.slots) {
      const parentNode = (patch as SubPatch).parentNode;
      const slotNumber = patch.slotsNode.slots.indexOf(parentNode);
      if (slotNumber === patch.slotsNode.slots.length - 1) {
        const outlet = patch.slotsNode.outlets[0];
        if (outlet) {
          const c = getOutboundConnectionsFromOutlet(outlet, visitedConnections);
          resolvedSubpatchConnections.push(...c);
        }
      } else {
        const slot = patch.slotsNode.slots[slotNumber + 1];
        if (slot?.subpatch) {
          const ins = slot.subpatch.objectNodes.filter((x) => {
            const objectNode = x as ObjectNode;
            const { name } = objectNode;
            const inNum = objectNode.arguments[0];
            if (name === "in" && inNum === 1) {
              return true;
            }
            return false;
          });
          for (const inNode of ins) {
            resolvedSubpatchConnections.push(
              ...inNode.outlets.flatMap((outlet) =>
                getOutboundConnectionsFromOutlet(outlet, visitedConnections),
              ),
            );
          }
        }
      }
    } else {
      const outlet = (patch as SubPatch).parentNode.outlets[outletNumber];

      if (outlet) {
        resolvedSubpatchConnections.push(
          ...getOutboundConnectionsFromOutlet(outlet, visitedConnections),
        );
      }
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

export const getInboundConnections = (inlet: IOlet): IOConnection[] => {
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
        (outletNumber === 1 && x.name === "patchmessage" && x.inlets[0].connections.length > 0) ||
        (x.name === "out" && x.arguments[0] === outletNumber && x.inlets[0].connections.length > 0),
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
    if (patch.slotsNode?.slots) {
      const parentNode = (patch as SubPatch).parentNode;
      const slotNumber = patch.slotsNode.slots.indexOf(parentNode);
      if (slotNumber === 0) {
        const inlet = patch.slotsNode.inlets[inletNumber];
        if (inlet) {
          const c = getInboundConnections(inlet);
          resolvedSubpatchConnections.push(...c);
        }
      } else {
        const slot = patch.slotsNode.slots[slotNumber - 1];
        if (slot?.subpatch) {
          const outs = slot.subpatch.objectNodes.filter((x) => {
            const objectNode = x as ObjectNode;
            const { name } = objectNode;
            const outNum = objectNode.arguments[0];
            if (name === "out" && outNum === 1) {
              return true;
            }
            return name === "patchmessage";
          });
          for (const out of outs) {
            resolvedSubpatchConnections.push(
              ...out.inlets.flatMap((inlet) => getInboundConnections(inlet)),
            );
          }
        }
      }
    } else {
      let inlet = (patch as SubPatch).parentNode.inlets[inletNumber];
      if (inlet) {
        const c = getInboundConnections(inlet);
        resolvedSubpatchConnections.push(...c);
      }
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
