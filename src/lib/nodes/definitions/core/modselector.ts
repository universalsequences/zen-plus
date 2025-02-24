import Subpatch from "../../Subpatch";
import { getRootPatch } from "../../traverse";
import type {
  AttributeValue,
  IOConnection,
  IOlet,
  Message,
  MessageObject,
  ObjectNode,
} from "../../types";
import { MutableValue } from "./MutableValue";
import { doc } from "./doc";

doc("modselector", {
  description: "select output to pipe through input",
  numberOfInlets: 1,
  numberOfOutlets: 0,
});

export const modselector = (node: ObjectNode) => {
  node.skipCompilation = true;
  node.needsMainThread = true;
  if (!node.attributes.input) {
    node.attributes.input = 1;
    node.attributeCallbacks.input = (_message: AttributeValue) => {};
  }

  if (!node.size) {
    node.size = { width: 75, height: 20 };
  }

  if (!node.custom) {
    node.custom = new MutableValue(node);
  }

  const cache: { [id: string]: ObjectNode } = {};
  let connectedSource: ConnectedSource | undefined = undefined;

  const disconnect = () => {
    if (connectedSource) {
      connectedSource.source.disconnect(connectedSource.connection, false, false);
      connectedSource = undefined;
    } else if (node.saveData) {
      const { source, outlet } = node.saveData as MessageObject;
      const root = getRootPatch(node.patch);
      const allNodes = root
        .getAllNodes()
        .flatMap((x) => (x.name === "slots~" ? (x as ObjectNode).slots || x : x));

      const sourceNode = allNodes.find((x) => x.id === (source as string));
      if (sourceNode) {
        const dest = (node.patch as Subpatch).parentNode;
        const inletNumber = (node.attributes.input as number) - 1;
        const inlet = dest.inlets[inletNumber];
        const outletNode = sourceNode.outlets[outlet as number];
        const connection = inlet.connections.find(
          (x) =>
            x.source === sourceNode &&
            x.destination === dest &&
            x.sourceOutlet === outletNode &&
            x.destinationInlet === inlet,
        );
        if (connection) {
          sourceNode.disconnect(connection, false, false);
        }
      }
    }
  };

  const useSource = (source: ObjectNode, outletNumber: number) => {
    if (connectedSource) {
      disconnect();
    }
    const outlet = source.outlets[outletNumber as number];

    if (!outlet) {
      return;
    }

    node.saveData = {
      source: source.id,
      outlet: outletNumber,
    };
    if (source.audioNode) {
      const dest = (node.patch as Subpatch).parentNode;
      if (dest) {
        const inletNumber = (node.attributes.input as number) - 1;
        const inlet = dest.inlets[inletNumber];
        const connection = source.connect(dest, inlet, outlet, false);

        connectedSource = {
          source,
          outlet,
          connection,
        };
      }
    }
    if (node.onNewValue) {
      node.onNewValue({ source: source.id, outlet: outletNumber });
    }
  };

  return (message: Message) => {
    if (message === "bang") {
      if (node.saveData) {
        const { source, outlet } = node.saveData as MessageObject;
        const root = getRootPatch(node.patch);
        const allNodes = root
          .getAllNodes()
          .flatMap((x) => (x.name === "slots~" ? (x as ObjectNode).slots || x : x));

        const sourceNode = allNodes.find((x) => x.id === (source as string));
        if (sourceNode) {
          useSource(sourceNode, outlet as number);
          return [];
        }
      }
    }
    if (message === "clear") {
      disconnect();
      return [];
    }
    if (typeof message !== "object") {
      return [];
    }

    const { id, outlet } = message as MessageObject;

    if (cache[id as string]) {
      const sourceNode = cache[id as string];
      useSource(sourceNode, outlet as number);
      return [];
    }
    const root = getRootPatch(node.patch);
    const allNodes = root
      .getAllNodes()
      .flatMap((x) => (x.name === "slots~" ? (x as ObjectNode).slots || x : x));
    const sourceNode = allNodes.find((x) => x.id === (id as string));
    if (sourceNode) {
      useSource(sourceNode, outlet as number);
    }

    return [];
  };
};

interface ConnectedSource {
  source: ObjectNode;
  outlet: IOlet;
  connection: IOConnection;
}
