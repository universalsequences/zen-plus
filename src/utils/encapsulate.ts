import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import type {
  IOlet,
  Node,
  ObjectNode,
  Patch,
  IOConnection,
  MessageNode,
} from "@/lib/nodes/types";

export const encapsulateNodes = (
  nodesToEncapsulate: Node[],
  patch: Patch,
  createObjectNode: () => ObjectNode,
  registerConnection: (id: string, x: IOConnection) => void,
  deleteNodes: (x: (ObjectNode | MessageNode)[], y: boolean) => void,
) => {
  const nodes = nodesToEncapsulate.filter(
    (x) => (x as ObjectNode).name !== "in" && (x as ObjectNode).name !== "out",
  );
  const inboundConnections = nodes.flatMap((node) =>
    node.inlets.flatMap((inlet) =>
      inlet.connections.filter(
        (connection) => !nodes.includes(connection.source),
      ),
    ),
  );

  const outboundConnections = nodes.flatMap((node) =>
    node.outlets.flatMap((outlet) =>
      outlet.connections.filter(
        (connection) => !nodes.includes(connection.destination),
      ),
    ),
  );

  const objectNode = createObjectNode();
  objectNode.parse("zen");
  patch.objectNodes = patch.objectNodes.filter((x) => !nodes.includes(x));
  patch.messageNodes = patch.messageNodes.filter((x) => !nodes.includes(x));

  const subpatch = objectNode.subpatch;

  if (!subpatch) {
    return;
  }

  for (const x of subpatch.objectNodes) {
    for (const y of x.inlets) {
      y.connections = [];
    }
    for (const y of x.outlets) {
      y.connections = [];
    }
  }

  for (const x of subpatch.messageNodes) {
    for (const y of x.outlets) {
      y.connections = [];
    }
  }

  subpatch.objectNodes = subpatch.objectNodes.filter((x) => x.name !== "+");

  const inputNodes: ObjectNode[] = [];
  const incomingNodes: IOlet[] = [];
  let inletCounter = 0;

  for (let i = 0; i < inboundConnections.length; i++) {
    const node = inboundConnections[i].destination;
    const connection = inboundConnections[i];

    connection.destinationInlet.connections =
      connection.destinationInlet.connections.filter((x) => x !== connection);
    connection.sourceOutlet.connections =
      connection.sourceOutlet.connections.filter((x) => x !== connection);

    const existingIndex = incomingNodes.indexOf(connection.sourceOutlet);
    let inputNode: ObjectNode =
      existingIndex >= 0
        ? inputNodes[existingIndex]
        : new ObjectNodeImpl(subpatch);
    if (i >= 2) {
      const position = (node as ObjectNode).position;
      if (existingIndex === -1) {
        subpatch.objectNodes.push(inputNode);
        inputNode.position = {
          x: position.x,
          y: Math.max(0, position.y - 30),
        };
        const name = connection.sourceOutlet.name || "";
        inputNode.parse(`in ${inletCounter + 1} ${name}`);
        inputNodes.push(inputNode);
        incomingNodes.push(connection.sourceOutlet);
        inletCounter++;
      }
    } else {
      const n = subpatch.objectNodes.find((x) =>
        x.text.includes(`in ${i + 1}`),
      );
      if (!n) {
        continue;
      }
      inputNode = n as ObjectNode;
      if (existingIndex === -1) {
        inputNodes.push(inputNode);
        incomingNodes.push(connection.sourceOutlet);
        inletCounter++;
      }
    }
    for (const inlet of node.inlets) {
      inlet.connections.splice(inlet.connections.indexOf(connection), 1);
    }
    for (const _outlet of connection.source.outlets) {
      _outlet.connections = _outlet.connections.filter((c) => c !== connection);
    }
    const _index = existingIndex >= 0 ? existingIndex : inletCounter - 1;

    if (existingIndex === -1) {
      let _connection = connection.source.connect(
        objectNode,
        objectNode.inlets[_index],
        connection.sourceOutlet,
        false,
      );
      registerConnection(connection.source.id, _connection);
    }

    inputNode.connect(
      connection.destination,
      connection.destinationInlet,
      inputNode.outlets[0],
      false,
    );
  }

  const outputNodes: ObjectNode[] = [];
  const outerNodes: IOlet[] = [];

  let outletCounter = 1;
  console.log("outbound connections=", outboundConnections);

  for (let i = 0; i < outboundConnections.length; i++) {
    const node = outboundConnections[i].source;
    const connection = outboundConnections[i];

    // filter out this connection as we are gonna reconstruct it
    connection.destinationInlet.connections =
      connection.destinationInlet.connections.filter((x) => x !== connection);
    connection.sourceOutlet.connections =
      connection.sourceOutlet.connections.filter((x) => x !== connection);

    const existingIndex = outerNodes.indexOf(connection.sourceOutlet);
    let outputNode: ObjectNode =
      existingIndex >= 0
        ? outputNodes[existingIndex]
        : new ObjectNodeImpl(subpatch);

    if (i >= 1) {
      const position = (node as ObjectNode).position;
      if (existingIndex === -1) {
        subpatch.objectNodes.push(outputNode);
        outputNode.position = {
          x: position.x,
          y: Math.max(0, position.y - 30),
        };
        outputNode.parse("out " + (outletCounter + 1));
        outputNodes.push(outputNode);
        outerNodes.push(connection.sourceOutlet);
        outletCounter++;
      } else {
      }
    } else {
      const n = subpatch.objectNodes.find((x) => x.text === "out " + (i + 1));
      if (!n) {
        continue;
      }
      outputNode = n as ObjectNode;
      if (existingIndex === -1) {
        outputNodes.push(outputNode);
        outerNodes.push(connection.sourceOutlet);
      }
    }

    /*
    for (const outlet of node.outlets) {
      outlet.connections.splice(outlet.connections.indexOf(connection), 1);
    }
    */

    const _index = existingIndex >= 0 ? existingIndex : outletCounter - 1;
    const _connection = objectNode.connect(
      connection.destination,
      connection.destinationInlet,
      objectNode.outlets[_index],
      false,
    );
    registerConnection(connection.source.id, _connection);

    connection.source.connect(
      outputNode,
      outputNode.inlets[0],
      connection.sourceOutlet,
      false,
    );
  }

  for (const node of nodes) {
    // its a object
    node.patch = subpatch;
    if ((node as ObjectNode).operatorContextType !== undefined) {
      subpatch.objectNodes.push(node as ObjectNode);
    } else {
      subpatch.messageNodes.push(node as MessageNode);
      // its a message
    }
  }

  deleteNodes(nodes as (ObjectNode | MessageNode)[], true);
};
