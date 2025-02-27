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
} from "@/lib/nodes/types";
import { OperatorContextType, isCompiledType } from "@/lib/nodes/context";
import { v4 as uuidv4 } from "uuid";
import { uuid } from "@/lib/uuid/IDGenerator";
import { VMEvaluation } from "@/workers/vm/VM";
import { BaseNode } from "@/lib/nodes/ObjectNode";

/**
 * all node types must extend this (i.e. ObjectNode and MessageNode)
 */
export class MockBaseNode implements Node {
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
    const objectNode = this as unknown as ObjectNode;
    if (objectNode.isAsync) {
      if (objectNode.instructions && objectNode.patch.vm) {
        const r: VMEvaluation = objectNode.patch.vm.evaluateNode(this.id, msg);
        // need to pass this back to main-thread
        objectNode.patch.vm.sendEvaluationToMainThread?.(r);
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
    return connection;
  }

  disconnectAudioNode(connection: IOConnection) {}

  connectAudioNode(connection: IOConnection) {}

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
