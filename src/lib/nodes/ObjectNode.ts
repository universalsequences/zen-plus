import { registerUUID, uuid } from "@/lib/uuid/IDGenerator";
import { parse } from "./objectNode/parse";
import type { Definition } from "../docs/docs";
import { type OperatorContext, OperatorContextType, isCompiledType } from "./context";
import type { CompoundOperator, Operator, Statement } from "./definitions/zen/types";
import type { AttributeValue, IOConnection, MessageNode } from "./types";
import type { Node, SerializableCustom, SerializedPatch, Size } from "./types";

import {
  ConnectionType,
  type Coordinate,
  type IOlet,
  type Identifier,
  type InstanceFunction,
  type Message,
  type MessageObject,
  type ObjectNode,
  type Patch,
  type SerializedObjectNode,
  type SubPatch,
} from "./types";
import { type Slot, deserializedSlots } from "./definitions/audio/slots";
import { GenericStepData } from "./definitions/core/zequencer/types";
import { Instruction } from "./vm/types";
import { MatrixType, createMatrixBuffer } from "./definitions/core/matrix";
import {
  type SerializedOutlet,
  type AttributeCallbacks,
  type AttributeOptions,
  type SerializedConnection,
  type Attributes,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { compileVM } from "./vm/forwardpass";
import { getRootPatch } from "./traverse";
import { PresetManager } from "./definitions/core/preset";
import { getInboundConnections } from "./vm/traversal";

interface Constants {
  [x: string]: number | boolean;
}

const CONSTANTS: Constants = {
  twopi: 2 * Math.PI,
  halfpi: 0.5 * Math.PI,
  pi: Math.PI,
  false: false,
  true: true,
};

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
        try {
          sourceNode.disconnect(connection.splitter);
        } catch (e) {
          console.error(e);
        }
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
      const splitter = this.patch.audioContext!.createChannelSplitter(
        sourceOutlet.chans ? sourceOutlet.chans * this.outlets.length : this.outlets.length,
      );
      connection.splitter = splitter;
      sourceNode.connect(splitter);

      if ((connection.destination as ObjectNode).merger) {
        destNode = (connection.destination as ObjectNode).merger;
      }
      if (destNode) {
        const outletNumber = this.outlets.indexOf(sourceOutlet);
        const inletNumber = destination.inlets.indexOf(destinationInlet);
        if (sourceOutlet.mc) {
          const sourceChans = sourceOutlet.chans as number;
          const destChans = destinationInlet.chans || 1;

          for (let i = 0; i < sourceChans; i++) {
            const j = destinationInlet.mc ? i : 0;
            const outIndex = outletNumber * sourceChans + i;
            const inIndex = inletNumber * destChans + j;
            splitter.connect(destNode, outIndex, inIndex);
          }
        } else {
          if (destinationInlet.mc) {
            // we are going from non-mc to mc inlet
            const destChans = destinationInlet.chans || 1;
            for (let i = 0; i < destChans; i++) {
              splitter.connect(
                destNode,
                outletNumber,
                i + destChans * destination.inlets.indexOf(destinationInlet),
              );
            }
          } else {
            splitter.connect(destNode, outletNumber, destination.inlets.indexOf(destinationInlet));
          }
        }
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

export default class ObjectNodeImpl extends BaseNode implements ObjectNode {
  id: Identifier;
  isSpecialCase?: boolean;

  created?: boolean;
  isInletSumSpecialCase?: boolean;
  needsLoad?: boolean;
  inlets: IOlet[];
  outlets: IOlet[];
  lastSentMessage?: Message;
  isCycle?: boolean;
  position: Coordinate;
  presentationPosition?: Coordinate;
  zIndex: number;
  name?: string;
  fn?: InstanceFunction;
  text: string;
  arguments: Message[];
  subpatch?: SubPatch;
  buffer?: Float32Array | Uint8Array | MessageObject[];
  size?: Size;
  audioNode?: AudioNode;
  operatorContextType: OperatorContextType;
  storedMessage?: Message;
  saveData?: any;
  custom?: SerializableCustom;
  definition?: Definition;
  slots?: Slot[];
  steps?: GenericStepData[];
  script?: string;
  instructions?: Instruction[];
  isAsync?: boolean;

  constructor(patch: Patch, id?: string) {
    super(patch);

    this.zIndex = 0;

    this.id = id || uuid();
    this.text = "";
    this.inlets = [];
    this.outlets = [];
    this.position = { x: 0, y: 0 };
    this.newAttribute("Include in Presentation", false, () => {
      this.patch.objectNodes = [...this.patch.objectNodes];
      if (this.patch.setObjectNodes) {
        this.patch.setObjectNodes(this.patch.objectNodes);
      }
    });
    this.newAttribute("font-size", 9);
    this.arguments = [];
    this.operatorContextType = OperatorContextType.ZEN;
    this.newAttribute("scripting name", "", (x: AttributeValue) => {
      if (typeof x === "string") {
        const patch = getRootPatch(this.patch);
        patch.scriptingNameToNodes[x] = [...(patch.scriptingNameToNodes[x] || []), this];
      }
    });
  }

  /**
   * adds attributes to object and removes them from string
   */
  parseAttributes(text: string, context: OperatorContext): string {
    delete this.attributes["min"];
    delete this.attributes["max"];
    const tokens = text.split(" ").filter((x) => x.length > 0);
    const name = tokens[0];
    const nonAttributeTokens = [name];
    const definition: Definition | null = context.lookupDoc(name);
    if (definition) {
      if (definition.attributes) {
        this.attributes = {
          ...definition.attributes,
        };
      }
    }

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token[0] === "@") {
        const attributeName = token.slice(1);
        const attributeValue = tokens[i + 1];
        if (attributeValue.includes(",")) {
          const splits = attributeValue.split(",");
          const vals: number[] = [];
          for (const sp of splits) {
            vals.push(Number.parseFloat(sp));
          }
          this.attributes[attributeName] = vals;
        } else if (Number.isNaN(Number.parseFloat(attributeValue))) {
          this.attributes[attributeName] = attributeValue;
        } else {
          this.attributes[attributeName] = Number.parseFloat(attributeValue);
        }
        i++;
      } else {
        nonAttributeTokens.push(token);
      }
    }
    return nonAttributeTokens.join(" ");
  }

  /**
   * Parses the given text and updates the instance's name property,
   * arguments and sets the correct NodeFunction
   * called from the UI when user types into an object node box
   *
   * @param _text {string} - The text input by the user to parse
   */
  parse(
    _text: string,
    contextType: OperatorContextType = this.operatorContextType,
    compile = true,
    patchPreset?: SerializedPatch,
  ): boolean {
    const ret = parse(this, _text, contextType, compile, patchPreset);
    this.updateWorkerState();
    return ret;
  }

  updateWorkerState() {
    if (this.skipCompilation || isCompiledType(this.operatorContextType)) return;
    if (getRootPatch(this.patch).finishedInitialCompile) {
      this.patch.sendWorkerMessage?.({
        type: "updateObject",
        body: {
          nodeId: this.id,
          json: this.getJSON(),
        },
      });
    }
  }

  clearCache() {
    this.inputNodeCache = {};
    this.inletIndexCache = {};
  }

  // Cache input nodes and their outlet connections for each inlet
  inputNodeCache: {
    [inletId: string]: {
      inputNode: ObjectNode;
      outlet: IOlet;
      connections: IOConnection[];
    } | null;
  } = {};

  inletIndexCache: { [key: string]: number } = {};

  // Cache inlet indices to avoid indexOf calls

  pipeSubPatch(inlet: IOlet, _message: Message, fromNode?: Node) {
    if (!this.subpatch || _message === undefined) {
      return;
    }

    // Use cached inlet index or compute and cache it
    const inletIndex =
      this.inletIndexCache[inlet.id] ||
      (this.inletIndexCache[inlet.id] = this.inlets.indexOf(inlet));
    const inputNumber = inletIndex + 1;

    // Use cached input node info or find and cache it
    let cached = this.inputNodeCache[inlet.id];
    if (!cached) {
      const inputNode = this.subpatch.objectNodes.find(
        (x) => x.name === "in" && x.arguments[0] === inputNumber,
      );
      if (!inputNode?.outlets[0]) {
        this.inputNodeCache[inlet.id] = null;
        return;
      }
      cached = {
        inputNode,
        outlet: inputNode.outlets[0],
        connections: inputNode.outlets[0].connections,
      };
      this.inputNodeCache[inlet.id] = cached;
    } else if (cached === null) {
      return;
    }

    let message = _message;
    const { inputNode, connections } = cached;

    // Apply min/max constraints if needed
    const ogType = (message as Statement).type;
    if (inputNode.attributes.min !== undefined) {
      message = ["max" as Operator, inputNode.attributes.min as number, message as Statement];
      (message as Statement).type = ogType;
    }
    if (inputNode.attributes.max !== undefined) {
      message = ["min" as Operator, inputNode.attributes.max as number, message as Statement];
      (message as Statement).type = ogType;
    }

    // Send message through all cached connections
    for (const { destination, destinationInlet } of connections) {
      destination.receive(destinationInlet, message, fromNode);
    }
  }

  newInlet(name?: string, c?: ConnectionType) {
    const t = this.operatorContextType;

    const calculated: ConnectionType =
      t === OperatorContextType.AUDIO
        ? ConnectionType.AUDIO
        : t === OperatorContextType.ZEN
          ? ConnectionType.ZEN
          : t === OperatorContextType.GL
            ? ConnectionType.GL
            : ConnectionType.CORE;
    super.newIOlet(this.inlets, name, c || calculated);
  }

  newOutlet(name?: string, c?: ConnectionType) {
    const t = this.operatorContextType;
    const calculated: ConnectionType =
      t === OperatorContextType.AUDIO
        ? ConnectionType.AUDIO
        : t === OperatorContextType.ZEN
          ? ConnectionType.ZEN
          : t === OperatorContextType.NUMBER
            ? ConnectionType.NUMBER
            : t === OperatorContextType.GL
              ? ConnectionType.GL
              : ConnectionType.CORE;
    super.newIOlet(this.outlets, name, c || calculated);
  }

  processMessageForAttributes(message: Message) {
    if (message === "clear") {
      this.fn?.(message);
      return true;
    }
    if (typeof message === "string" && message !== "bang") {
      const tokens = message.split(" ").filter((x) => x.length > 0);
      const attributeName = tokens[0];
      /*
      if (this.subpatch) {
        // if this is a subpatch thats receiving messages...
        // we need to pass it off to subpatch
        return this.subpatch.processMessageForParam(message);
      }
      */
      if (attributeName === "set-size") {
        const width = Number.parseInt(tokens[1]);
        const height = Number.parseInt(tokens[2]);
        this.updateSize({ width, height });
        return true;
      }
      if (this.attributes[attributeName] === undefined) {
        return;
      }
      const attributesValue = tokens[1];

      if (!Number.isNaN(Number.parseFloat(attributesValue)) && !attributesValue.includes(",")) {
        this.setAttribute(attributeName, Number.parseFloat(attributesValue));
      } else {
        this.setAttribute(attributeName, attributesValue || "");
      }
      return true;
    }

    return false;
  }

  applyInletSumming(inlet: IOlet, message: Message, fromNode?: Node): Message {
    let debug = this.attributes.debug;
    if (typeof message === "string") {
      return message;
    }
    if ((this.name === "accum" && this.inlets.indexOf(inlet) >= 2) || this.isInletSumSpecialCase) {
      return message;
    }

    if (message && Array.isArray(message) && message[0] === "nth") {
      // TODO: need something better for here, cuz this is ugly
      return message;
    }

    if (
      message &&
      Array.isArray(message) &&
      message[0] &&
      (message[0] as CompoundOperator).name === "modeling.synth"
    ) {
      // TODO: need something better for here, cuz this is ugly
      return message;
    }

    const lastMessage: Message | undefined = inlet.lastMessage;
    if (
      lastMessage !== undefined &&
      ((inlet.lastMessage as Statement).node === undefined ||
        (message as Statement).node === undefined ||
        (inlet.lastMessage as Statement).node !== (message as Statement).node)
    ) {
      if (
        this.operatorContextType === OperatorContextType.ZEN ||
        this.operatorContextType === OperatorContextType.GL
      ) {
        if ((message as Statement).node?.id.includes("history")) {
          return message;
        }
        if ((lastMessage as Statement).node?.id.includes("history")) {
          return message;
        }
        // go thru the market messages and this message and add them
        const nodes = new Set<Node>();
        if (fromNode) {
          nodes.add(fromNode);
        }
        let statement = message as Statement;
        const operator = this.operatorContextType === OperatorContextType.GL ? "+" : "add";
        for (const markedMessage of inlet.markedMessages || []) {
          const node = markedMessage.node;
          if (node && nodes.has(node)) {
            continue;
          }
          if (node) {
            nodes.add(node);
          }
          const type = statement.type || (markedMessage.message as Statement).type;
          statement = [operator as Operator, statement, markedMessage.message as Statement];
          statement.type = type;
          const newId = Math.round(Math.random() * 1000000);
          statement.node = {
            ...this,
            id: `${newId}_sumation`,
          };
        }
        if (typeof statement === "number") {
          return statement;
        }
        const newId = Math.round(Math.random() * 1000000);
        statement.node = {
          ...this,
          id: `${newId}_sumation`,
        };

        this.lastSentMessage = undefined;
        return statement;
      }
    }
    return message;
  }

  markMessage(inlet: IOlet, message: Message, fromNode?: Node) {
    const zenBase = this.patch.getZenBase();
    const isCompilable =
      this.operatorContextType === OperatorContextType.ZEN ||
      this.operatorContextType === OperatorContextType.GL;
    let isCompiling =
      (zenBase?.isCompiling && isCompilable) || (this.patch.skipRecompile && isCompilable);
    if (Array.isArray(message) && (message as Statement).node) {
      isCompiling = true;
    }

    if ((this.patch as SubPatch).patchType === OperatorContextType.CORE) {
      return;
    }
    if (this.name === "out" && (this.patch as SubPatch).patchType !== OperatorContextType.ZEN) {
      return;
    }
    if (!isCompiling && this.operatorContextType !== OperatorContextType.GL) {
      return;
    }
    if (this.name === "uniform") {
      return;
    }
    if (!inlet.markedMessages) {
      inlet.markedMessages = [];
    }
    inlet.markedMessages.push({ message: message, node: fromNode });

    /*
    if (!inlet.markedMessages) {
      inlet.markedMessages = [];
    }
    inlet.markedMessages.push({ message: message, node: fromNode });
    */

    if (inlet.messagesReceived === undefined) {
      inlet.messagesReceived = 0;
    }
    inlet.messagesReceived++;
  }

  checkFiltering(message: Message) {
    const zenBase = this.patch.getZenBase();
    const isCompilable =
      this.operatorContextType === OperatorContextType.ZEN ||
      this.operatorContextType === OperatorContextType.GL;
    let isCompiling =
      (zenBase?.isCompiling && isCompilable) || (this.patch.skipRecompile && isCompilable);
    if (Array.isArray(message) && (message as Statement).node) {
      isCompiling = true;
    }

    let ignoreMessage = false;
    if (
      this.operatorContextType === OperatorContextType.ZEN ||
      this.operatorContextType === OperatorContextType.GL
    ) {
      if (typeof message === "number" || (this.name !== "zen" && this.name !== "out")) {
        isCompiling = true;
      }

      if (
        isCompiling &&
        typeof message !== "function" &&
        !Array.isArray(message) &&
        !ArrayBuffer.isView(message) &&
        typeof message !== "number" &&
        typeof message !== "string"
      ) {
        // we don't want to deal with objects at all while compiling.
        // compilation is done completely via functions and arrays
        ignoreMessage = true;
      }
    }
    if (this.name === "polytrig") {
      ignoreMessage = false;
    }
    return { isCompiling, ignoreMessage };
  }

  shouldSkipInletMessage(inlet: IOlet, message: Message, isCompiling: boolean) {
    const indexOf = this.inlets.indexOf(inlet);

    if (
      isCompiling &&
      (this.operatorContextType === OperatorContextType.ZEN ||
        this.operatorContextType === OperatorContextType.GL)
    ) {
      const INLETS = [];
      for (let inlet of this.inlets) {
        for (const connection of inlet.connections) {
          const node = connection.source as ObjectNode;
          if (node && node.name === "in") {
            // then we actually want the inlet refering to that
            const num = (node.arguments[0] as number) - 1;
            const baseNode = (connection.source.patch as SubPatch).parentNode;
            const _inlet = baseNode.inlets[num];
            if (_inlet) {
              inlet = _inlet;
              break;
            }
          }
        }
        INLETS.push(inlet);
      }

      const inbound = INLETS.flatMap((inlet) => getInboundConnections(inlet));

      const debug_inlets = INLETS.filter(
        (inlet) =>
          inlet.messagesReceived! <
          inbound
            .filter((x) => x.destinationInlet === inlet)
            .filter(
              (x) =>
                x.source &&
                ((!(x.source as ObjectNode).name &&
                  (x.source as MessageNode).messageType === undefined) ||
                  ((x.source as MessageNode).messageType === undefined &&
                    (x.source as ObjectNode).name !== "attrui")),
            ).length,
      );

      const _inlets = INLETS.filter(
        (inlet) =>
          inlet.messagesReceived! <
          inlet.connections.filter(
            (x) =>
              x.source &&
              ((!(x.source as ObjectNode).name &&
                (x.source as MessageNode).messageType === undefined) ||
                ((x.source as MessageNode).messageType === undefined &&
                  (x.source as ObjectNode).name !== "attrui")),
          ).length,
      );
      if (typeof message !== "string" && _inlets.length > 0) {
        if ((this.name === "accum" && indexOf >= 2) || this.isInletSumSpecialCase) {
        } else {
          return true;
        }
      }
    }

    return false;
  }

  alreadyReceivedCompilationMessage() {
    return (
      (this.operatorContextType === OperatorContextType.ZEN ||
        this.operatorContextType === OperatorContextType.GL) &&
      this.lastSentMessage !== undefined &&
      !this.isSpecialCase
    );
  }

  handleSizeMessage(message: string) {
    const [_op, w, h] = message.split(" ");
    const width = Number.parseInt(w);
    const height = Number.parseInt(h);
    this.updateSize({ width, height });
    this.size = { width, height };
  }

  updateSize(size: Size) {
    // any hooks
    this.size = { ...size };
    const root = getRootPatch(this.patch);
    if (root.onUpdateSize) {
      root.onUpdateSize(this.id, this.size);
    }

    if (this.name === "zen") {
      const resizeNodes =
        this.subpatch?.objectNodes.filter((x) => x.name === "onPatchResize") || [];
      for (const n of resizeNodes) {
        n.receive(n.inlets[0], [size.width, size.height]);
      }
    }
  }

  receive(inlet: IOlet, message: Message, fromNode?: Node) {
    if (!this.fn) {
      return;
    }

    if (this.instructions && inlet.isHot) {
      if (this.isAsync) {
        return;
      }
      inlet.lastMessage = message;
      this.patch.sendWorkerMessage?.({
        type: "evaluateNode",
        body: {
          nodeId: this.id,
          message: message,
        },
      });

      return;
    }

    if (this.definition && !this.definition.isHot) {
      const indexOf = this.inletIndexCache[inlet.id] || this.inlets.indexOf(inlet);
      this.inletIndexCache[inlet.id] = indexOf;
      if (indexOf > 0) {
        super.receive(inlet, message, fromNode);
        const argumentNumber = indexOf - 1;
        this.arguments[argumentNumber] = message;
        return;
      }
    }

    if (typeof message === "string" && message.startsWith("set-size")) {
      this.handleSizeMessage(message);
      return;
    }

    if (this.subpatch) {
      if (
        this.processMessageForAttributes(message) &&
        (!inlet.node || inlet.node.attributes.type !== "core")
      ) {
        return;
      }
      this.pipeSubPatch(inlet, message, fromNode);
      return;
    }

    if (this.operatorContextType === OperatorContextType.CORE && this.name !== "attrui") {
      const zenBase = this.patch.getZenBase();
      if (zenBase && zenBase.isCompiling) {
        if (this.name === "*" || this.name === "+" || this.name === "/" || this.name === "-") {
          // return;
        }
      }
    }

    if (
      this.processMessageForAttributes(message) &&
      (!inlet.node || inlet.node.attributes["type"] !== "core")
    ) {
      return;
    }

    const ogMessage = message;

    const { isCompiling, ignoreMessage } = this.checkFiltering(message);

    if (ignoreMessage) {
      return;
    }

    let debug = this.attributes.debug;
    if (isCompiling) {
      message = this.applyInletSumming(inlet, message, fromNode);
    }

    super.receive(inlet, message, fromNode);

    this.markMessage(inlet, ogMessage, fromNode);

    const indexOf = this.inlets.indexOf(inlet);

    if (indexOf > 0) {
      const argumentNumber = indexOf - 1;
      this.arguments[argumentNumber] = message;
    }

    if (this.definition && !this.definition.isHot && this.inlets.indexOf(inlet) > 0) {
      return;
    }

    if (this.shouldSkipInletMessage(inlet, message, isCompiling)) {
      return;
    }

    if (this.subpatch) {
      this.pipeSubPatch(inlet, message, fromNode);
      return;
    }

    if (isCompiling && this.alreadyReceivedCompilationMessage()) {
      return;
    }

    if (message === undefined) {
      return;
    }

    if (indexOf === 0) {
      // we are sending through the main inlet, i.e. run the function
      if (
        this.inlets.some((x, i) => x.lastMessage === undefined) &&
        this.name !== "out" &&
        this.name !== "in"
      ) {
        return;
      }
      const result: (Message | undefined)[] = this.fn(message);

      for (let i = 0; i < result.length; i++) {
        let outlet = this.outlets[i];
        if (outlet) {
          const outletResult = result[i];
          if (outletResult === undefined) {
            continue;
          }
          this.send(outlet, outletResult);
          if (outlet.callback) {
            outlet.callback(outletResult);
          }
        }
      }
      if (result[0]) {
        this.lastSentMessage = result[0];
      }
    } else if (indexOf > 0) {
      // store the message in arguments
      const argumentNumber = indexOf - 1;
      this.arguments[argumentNumber] = message;

      if (
        this.inlets.some((c, i) => c.lastMessage === undefined) &&
        this.name !== "out" &&
        this.name !== "in"
      ) {
        return;
      }

      // if we've already received a message in left-most inlet, we
      // run the function (assuming its a "hot inlet" for now)
      const lastMessage = this.inlets[0] && this.inlets[0].lastMessage;
      if (lastMessage !== undefined) {
        const result: (Message | undefined)[] = this.fn(lastMessage);

        for (let i = 0; i < result.length; i++) {
          const outletResult = result[i];
          if (outletResult === undefined) {
            continue;
          }
          if (this.outlets[i]) {
            this.send(this.outlets[i], outletResult);
          }
        }
        if (result[0]) {
          this.lastSentMessage = result[0];
        }
      }
    }
  }

  getJSON(): SerializedObjectNode {
    const json: any = {
      id: this.id,
      text: this.text,
      position: this.position,
      presentationPosition: this.presentationPosition,
      outlets: this.getConnectionsJSON(),
      size: this.size,
      operatorContextType: this.operatorContextType,
      script: this.script,
      locked: this.locked,
    };

    if (this.zIndex === -1) {
      json.zIndex = -1;
    }

    if (this.steps) {
      json.steps = this.steps;
    }

    if (this.slots) {
      json.slots = this.slots.map((x: ObjectNode) => x.getJSON());
    }

    if (this.custom) {
      json.custom = this.custom.getJSON();
    }

    if (this.buffer && this.name !== "buffer" && this.name !== "waveform") {
      if (ArrayBuffer.isView(this.buffer)) {
        json.buffer = Array.from(this.buffer);
      } else if (Array.isArray(this.buffer)) {
        json.buffer = Array.from(this.buffer);
      } else {
        json.buffer = [...this.buffer];
      }
    }

    if (this.saveData) {
      json.saveData = this.saveData;
    }

    if (!json.presentationPosition) {
      delete json.presentationPosition;
    }

    json.attributes = {};
    for (const name in this.attributes) {
      if (this.attributes[name] !== this.attributeDefaults[name]) {
        json.attributes[name] = this.attributes[name];
      }
    }
    if (Object.keys(json.attributes).length === 0) {
      delete json.attributes;
    }
    if (this.subpatch) {
      return {
        ...json,
        subpatch: this.subpatch.getJSON(),
      };
    }

    if (this.outlets.length > 1) {
      json.numberOfOutlets = this.outlets.length;
    }
    return json;
  }

  fromJSON(json: SerializedObjectNode, isPreset?: boolean) {
    if (json.buffer && json.attributes) {
      const _type = json.attributes.type as MatrixType;
      const _buffer = json.buffer.map((x) => (Number.isNaN(x) ? 0 : x));
      const { buffer } = createMatrixBuffer(this, json.buffer.length, _type, _buffer as number[]);
      this.buffer = buffer as Float32Array;
    }

    if (json.zIndex === -1) {
      this.zIndex = -1;
    }

    this.locked = json.locked;

    this.script = json.script;

    if (json.steps) {
      this.steps = json.steps;
    }

    //if (json.saveData) {
    //  this.storedMessage = json.saveData;
    //this.saveData = json.saveData;
    //}

    if (json.size) {
      this.size = json.size;
    }

    if (json.attributes) {
      const prevAttributes = { ...this.attributes };
      this.attributes = {
        ...this.attributes,
        ...json.attributes,
      };
      for (const name in json.attributes) {
        if (prevAttributes[name] !== json.attributes[name]) {
          this.setAttribute(name, json.attributes[name]);
        }
      }
    }

    this.position = json.position;
    if (json.presentationPosition) {
      this.presentationPosition = json.presentationPosition;
    }

    if (json.subpatch) {
      this.parse(
        json.text.includes("zen") && json.text.includes("@type") ? json.text : "zen",
        OperatorContextType.ZEN,
        false,
      );
    } else {
      this.parse(json.text, json.operatorContextType || OperatorContextType.ZEN, false);
    }
    if (json.numberOfOutlets) {
      for (let i = 0; i < json.numberOfOutlets; i++) {
        if (!this.outlets[i]) {
          this.newOutlet(
            undefined,
            this.operatorContextType === OperatorContextType.AUDIO
              ? ConnectionType.AUDIO
              : undefined,
          );
        }
      }
    }

    this.id = json.id;

    if (this.name === "zequencer.core") {
      this.steps = json.steps;
    }

    if (!isPreset) {
      registerUUID(this.id);
    }

    if (json.subpatch && this.subpatch) {
      this.subpatch.objectNodes = [];
      this.subpatch.fromJSON(json.subpatch, isPreset);
      if (this.size && json.size) {
        this.size.width = json.size.width;
        this.size.height = json.size.height;
      }
    }

    if (json.attributes) {
      this.attributes = {
        ...this.attributes,
        ...json.attributes,
      };
    }
    if (json.custom !== undefined && this.custom) {
      this.custom.fromJSON(json.custom);

      if (this.custom instanceof PresetManager) {
        (this.custom as PresetManager).notifyVM();
      }
    }

    if (json.slots) {
      deserializedSlots(this, json.slots, isPreset);
    }
  }

  getPatchPresetIfAny(name: string): SerializedPatch | null {
    // TODO: make this data-source modular, with multi data sources  beyond localstorage
    const payload = window.localStorage.getItem(`subpatch.${name}`);

    if (payload) {
      return JSON.parse(payload) as SerializedPatch;
    }
    return null;
  }

  useAudioNode(audioNode: AudioNode) {
    this.audioNode = audioNode;

    const channelCount =
      typeof this.attributes.chans === "number"
        ? this.audioNode.channelCount / this.attributes.chans
        : this.audioNode.channelCount;
    for (let i = 0; i < channelCount; i++) {
      if (!this.outlets[i]) {
        this.newOutlet(`channel ${i + 1}`, ConnectionType.AUDIO);
      }
    }
    for (const inlet of this.inlets) {
      inlet.connectionType = ConnectionType.AUDIO;
    }
    for (const outlet of this.outlets) {
      outlet.connectionType = ConnectionType.AUDIO;
    }
  }

  resetCompilationState() {
    const node = this;
    if (
      node.operatorContextType !== OperatorContextType.ZEN &&
      node.operatorContextType !== OperatorContextType.GL
    ) {
      return;
    }
    if (node.subpatch) {
      for (const x of node.inlets) {
        if (x.connections.length > 0) {
          x.messagesReceived = undefined;
          x.lastMessage = undefined;
          x.markedMessages = [];
        }
      }
      return;
    }
    for (const n of node.inlets) {
      if (n.connections.length > 0) {
        n.lastMessage = undefined;
        n.messagesReceived = undefined;
        n.markedMessages = [];
      }
    }
    node.lastSentMessage = undefined;
    const name = (node as ObjectNode).name;

    // note: do we want latchcall here
    if (
      name === "call" ||
      name === "defun" ||
      name === "polycall" ||
      name === "polytrig" ||
      name === "latchcall"
    ) {
      node.storedMessage = undefined;
    }
  }
}
