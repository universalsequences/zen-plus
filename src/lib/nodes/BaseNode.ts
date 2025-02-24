import {
  type SerializedOutlet,
  type AttributeCallbacks,
  type Coordinate,
  type AttributeOptions,
  type AttributeValue,
  type Patch,
  type IOConnection,
  ConnectionType,
  type SerializedConnection,
  type IOlet,
  type Message,
  type ObjectNode,
  type Node,
  type Attributes,
  SubPatch,
  MessageNode,
} from "./types";
import { OperatorContextType, isCompiledType } from "./context";
import { v4 as uuidv4 } from "uuid";
import { uuid } from "@/lib/uuid/IDGenerator";
import { compileVM } from "./vm/forwardpass";
import { getRootPatch } from "./traverse";

/**
 * all node types must extend this (i.e. ObjectNode and MessageNode)
 */
export class BaseNode implements Node {
  patch: Patch;
  inlets: IOlet[];
  outlets: IOlet[];
  attributes: Attributes;
  attributeCallbacks: AttributeCallbacks;
  attributeOptions: AttributeOptions;
  attributeDefaults: Attributes;
  id: string;
  position: Coordinate;
  zIndex: number;
  locked?: boolean;

  constructor(patch: Patch) {
    this.id = uuid();
    this.patch = patch;
    this.zIndex = 0;
    this.position = { x: 0, y: 0 };
    this.inlets = [];
    this.outlets = [];
    this.attributes = {};
    this.attributeCallbacks = {};
    this.attributeOptions = {};
    this.attributeDefaults = {};
  }

  newAttribute(name: string, defaultValue: AttributeValue, callback?: (x: AttributeValue) => void) {
    if (this.attributes[name] !== undefined) {
      if (callback) {
        this.attributeCallbacks[name] = callback;
      }
      return;
    }
    this.attributes[name] = defaultValue;
    if (defaultValue !== undefined) {
      this.attributeDefaults[name] = defaultValue;
    }

    if (callback) {
      this.attributeCallbacks[name] = callback;
    }
  }

  setAttribute(name: string, value: AttributeValue) {
    this.attributes[name] = value;
    if (this.attributeCallbacks[name]) {
      this.attributeCallbacks[name](value);
    }
    if (this.patch.updateAttributes) {
      this.patch.updateAttributes(this.id, { ...this.attributes });
    }
  }

  send(outlet: IOlet, msg: Message) {
    if ((this as unknown as ObjectNode).isAsync) {
      if ((this as unknown as ObjectNode).instructions) {
      }
      return;
    }
    const { connections } = outlet;

    for (const connection of connections) {
      const { source, destination, destinationInlet } = connection;
      if ((source as any) === this && destinationInlet) {
        destination.receive(destinationInlet, msg, this);
      }
    }
  }

  newInlet(name?: string, connectionType?: ConnectionType) {
    const isMessageType = (this as unknown as MessageNode).messageType !== undefined;
    const inletNumber = this.inlets.length;
    const definitionIsHot = (this as unknown as ObjectNode).definition?.isHot;
    const isHot = definitionIsHot || inletNumber === 0 || (isMessageType && inletNumber === 0);
    this.newIOlet(this.inlets, name, connectionType, isHot);
  }

  newOutlet(name?: string, connectionType?: ConnectionType) {
    this.newIOlet(this.outlets, name, connectionType);
  }

  newIOlet(iolets: IOlet[], name?: string, connectionType?: ConnectionType, isHot?: boolean) {
    const id = uuidv4();
    const inlet: IOlet = {
      id,
      name: name,
      connections: [],
      connectionType,
      isHot,
    };
    iolets.push(inlet);
  }

  connect(destination: Node, inlet: IOlet, outlet: IOlet, compile = true) {
    if (((this as unknown as ObjectNode).patch as SubPatch).clearCache) {
      (this as unknown as ObjectNode).patch.clearCache();
    }

    const connection: IOConnection = {
      source: this,
      destination,
      sourceOutlet: outlet,
      destinationInlet: inlet,
    };

    if (
      !outlet.connections.some(
        (x) =>
          x.destination === destination &&
          x.destinationInlet === inlet &&
          x.sourceOutlet === outlet,
      )
    ) {
      outlet.connections.push(connection);
    } else {
    }

    if (
      !inlet.connections.some(
        (x) => x.source === this && x.destinationInlet === inlet && x.sourceOutlet === outlet,
      )
    ) {
      inlet.connections.push(connection);
    }

    if (
      inlet.connectionType === ConnectionType.AUDIO &&
      outlet.connectionType === ConnectionType.AUDIO
    ) {
      this.connectAudioNode(connection);
    } else if (
      compile &&
      (isCompiledType(outlet.connectionType) || isCompiledType(inlet.connectionType))
    ) {
      if (
        !(this.patch as SubPatch).parentPatch ||
        (this.patch as SubPatch).patchType === OperatorContextType.ZEN ||
        (this.patch as SubPatch).patchType === OperatorContextType.GL
      ) {
        this.patch.recompileGraph();
      }
    }

    if (this.patch.registerConnect) {
      this.patch.registerConnect(
        this,
        destination as BaseNode,
        destination.inlets.indexOf(inlet),
        this.outlets.indexOf(outlet),
      );
    }

    if (
      compile &&
      !isCompiledType(outlet.connectionType) &&
      !this.patch.skipRecompile &&
      getRootPatch(this.patch).finishedInitialCompile
    ) {
      compileVM(this.patch, false);
    }
    return connection;
  }

  disconnectAudioNode(connection: IOConnection) {
    if (connection.splitter) {
      connection.splitter.disconnect();
      const sourceNode = (this as any as ObjectNode).audioNode;
      if (sourceNode) {
        sourceNode.disconnect(connection.splitter);
      }
      connection.splitter = undefined;
    }
  }

  connectAudioNode(connection: IOConnection) {
    const { destination, sourceOutlet, destinationInlet } = connection;
    // todo -- figure out why BaseNode is not being typed as ObjectNode
    const sourceNode = (this as unknown as ObjectNode).audioNode;
    let destNode = (destination as unknown as ObjectNode).audioNode;
    if (sourceNode && destNode) {
      const splitter = this.patch.audioContext!.createChannelSplitter(this.outlets.length);
      connection.splitter = splitter;
      sourceNode.connect(splitter);

      if ((connection.destination as ObjectNode).merger) {
        destNode = (connection.destination as ObjectNode).merger;
      }
      if (destNode) {
        splitter.connect(
          destNode,
          this.outlets.indexOf(sourceOutlet),
          destination.inlets.indexOf(destinationInlet),
        );
      }
    }
  }

  disconnect(connection: IOConnection, compile = true, ignoreAudio?: boolean) {
    if (((this as unknown as ObjectNode).patch as SubPatch).clearCache) {
      (this as unknown as ObjectNode).patch.clearCache();
    }
    for (const outlet of this.outlets) {
      outlet.connections = outlet.connections.filter((x) => x !== connection);
    }

    const dest = connection.destination;
    for (const inlet of dest.inlets) {
      inlet.connections = inlet.connections.filter((x) => x !== connection);
    }

    if (
      connection.destinationInlet.connectionType === ConnectionType.AUDIO &&
      connection.sourceOutlet.connectionType === ConnectionType.AUDIO
    ) {
      if (!ignoreAudio) {
        this.disconnectAudioNode(connection);
      }
    } else if (
      compile &&
      (connection.destinationInlet.connectionType === ConnectionType.ZEN ||
        connection.destinationInlet.connectionType === ConnectionType.GL)
    ) {
      this.patch.recompileGraph();
    }
  }

  disconnectAll() {
    for (const outlet of this.outlets) {
      for (const connect of outlet.connections) {
        this.disconnect(connect, false);
      }
      outlet.callback = undefined;
    }
  }

  receive(inlet: IOlet, msg: Message, fromNode?: Node) {
    inlet.lastMessage = msg;

    if (this.patch.registerReceive && !fromNode) {
      this.patch.registerReceive(this, msg, inlet);
    }
  }

  getConnectionsJSON(): SerializedOutlet[] {
    const json: SerializedOutlet[] = [];
    for (let i = 0; i < this.outlets.length; i++) {
      const outlet = this.outlets[i];
      const outletJson = [];
      for (const connection of outlet.connections) {
        const { destination, destinationInlet } = connection;
        const inletIndex = destination.inlets.indexOf(destinationInlet);
        const _json: SerializedConnection = {
          destinationId: destination.id,
          //destinationInlet: inletIndex
        };
        if (inletIndex > 0) {
          _json.destinationInlet = inletIndex;
        }
        if (connection.segmentation) {
          _json.segmentation = connection.segmentation;
        }
        outletJson.push(_json);
      }
      const x: SerializedOutlet = { connections: outletJson };
      if (i > 0) {
        x.outletNumber = i;
      }
      json.push(x);
    }
    return json;
  }
}
