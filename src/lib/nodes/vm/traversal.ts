import { getRootPatch } from "../traverse";
import type { IOConnection, ObjectNode, Patch, SubPatch, Node, IOlet } from "../types";
import { isObjectNode } from "./instructions";

export const getOutboundConnections = (
  n: Node,
  visitedConnections: Set<IOConnection>,
  zenPatch?: Patch,
): IOConnection[] => {
  return n.outlets.flatMap((x) =>
    getOutboundConnectionsFromOutlet(x, visitedConnections, zenPatch),
  );
};

const isSubscribe = (object: ObjectNode) => {
  return false;
  //const { name } = object;
  //return name === "subscribe" || name === "r";
};
const isStaticSubscribe = (object: ObjectNode) => {
  return false;
  //return isSubscribe(object) && object.inlets[1].connections.length === 0;
};

const isSendNode = (object: ObjectNode) => {
  return false;
  //const { name } = object;
  //return name === "send" || name === "s";
};

const isStaticPublish = (object: ObjectNode) => {
  return false;
  //return isSendNode(object) && object.inlets[1].connections.length === 0;
};

export const getOutboundConnectionsFromOutlet = (
  outlet: IOlet,
  visitedConnections: Set<IOConnection>,
  zenPatch?: Patch,
): IOConnection[] => {
  const rawConnections = outlet.connections;

  const connections = rawConnections.filter((x) => !visitedConnections.has(x));

  const subpatchConnections: IOConnection[] = [];
  const regularConnections: IOConnection[] = [];
  const outConnections: IOConnection[] = [];
  const slotConnections: IOConnection[] = [];
  const publishConnections: IOConnection[] = [];

  for (const c of connections) {
    const dest = c.destination as ObjectNode;
    const { name } = dest;
    if ((c.destination as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if (name === "out" || name === "patchmessage") {
      outConnections.push(c);
    } else if (name === "slots~") {
      slotConnections.push(c);
    } else if (isStaticPublish(dest)) {
      // we have "static"
      publishConnections.push(c);
      if (dest.arguments[0] === "bpm" || dest.arguments[0] === "isReset") {
        regularConnections.push(c);
      }
    } else {
      regularConnections.push(c);
    }
  }

  const resolvedSubpatchConnections: IOConnection[] = [];

  const handleInput = (input: ObjectNode | undefined) => {
    if (input) {
      resolvedSubpatchConnections.push(
        ...input.outlets.flatMap((outlet) =>
          getOutboundConnectionsFromOutlet(outlet, visitedConnections, zenPatch),
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

  for (const connection of publishConnections) {
    const publishNode = connection.destination as ObjectNode;
    const patch =
      publishNode.attributes.scope === "subtree"
        ? publishNode.patch
        : getRootPatch(publishNode.patch);

    const key = publishNode.arguments[0];
    const subscribeNodes = patch
      .getAllNodes()
      .filter((x) => isSubscribe(x) && x.arguments[0] === key);
    for (const subscribeNode of subscribeNodes) {
      regularConnections.push(
        ...getOutboundConnections(subscribeNode, visitedConnections, zenPatch),
      );
    }
  }

  for (const connection of outConnections) {
    // TODO - handle slots case
    const { destination } = connection;
    if (zenPatch === destination.patch) {
      resolvedSubpatchConnections.push(connection);
      continue;
    }
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
          const c = getOutboundConnectionsFromOutlet(outlet, visitedConnections, zenPatch);
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
                getOutboundConnectionsFromOutlet(outlet, visitedConnections, zenPatch),
              ),
            );
          }
        }
      }
    } else {
      const outlet = (patch as SubPatch).parentNode.outlets[outletNumber];

      if (outlet) {
        resolvedSubpatchConnections.push(
          ...getOutboundConnectionsFromOutlet(outlet, visitedConnections, zenPatch),
        );
      }
    }
  }

  const ret = [...regularConnections, ...resolvedSubpatchConnections].filter(
    (x) => !visitedConnections.has(x),
  );

  // place objects first and message second
  const objectConnections = ret.filter((x) => isObjectNode(x.destination));
  const messageConnections = ret.filter((x) => !isObjectNode(x.destination));
  return [...objectConnections, ...messageConnections];
};

export const forwardTraversal = (
  node: Node,
  visited = new Set<Node>(),
  isHot?: boolean,
): Node[] => {
  if (visited.has(node)) return [];
  visited.add(node);
  const outbound = getOutboundConnections(node, new Set<IOConnection>()).filter(
    (x) => isHot === undefined || x.destinationInlet.isHot === isHot,
  );
  return [node, ...outbound.flatMap((c) => forwardTraversal(c.destination, visited, isHot))];
};

export const getInboundConnections = (inlet: IOlet): IOConnection[] => {
  const connections = inlet.connections;
  const subpatchConnections: IOConnection[] = [];
  const regularConnections: IOConnection[] = [];
  const inConnections: IOConnection[] = [];
  const subscribeConnections: IOConnection[] = [];

  for (const c of connections) {
    if ((c.source as ObjectNode).subpatch) {
      subpatchConnections.push(c);
    } else if ((c.source as ObjectNode).name === "in") {
      inConnections.push(c);
    } else if (isStaticSubscribe(c.source as ObjectNode)) {
      subscribeConnections.push(c);
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

  for (const connection of subscribeConnections) {
    const subscribeNode = connection.source as ObjectNode;
    const patch = getRootPatch(subscribeNode.patch);
    const key = subscribeNode.arguments[0];
    const sendNodes = patch.getAllNodes().filter((x) => isSendNode(x) && x.arguments[0] === key);
    for (const sendNode of sendNodes) {
      if (sendNode.attributes.scope === "subtree") {
        // ensure we're below this one
        if (!sendNode.patch.getAllNodes().includes(subscribeNode)) {
          // we gotta skip this send
          continue;
        }
      }

      for (const inlet of sendNode.inlets) {
        regularConnections.push(...getInboundConnections(inlet));
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
