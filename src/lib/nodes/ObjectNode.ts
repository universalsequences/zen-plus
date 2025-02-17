import { NumberOfInlets } from "@/lib/docs/docs";
import { registerUUID, uuid } from "@/lib/uuid/IDGenerator";
import { parse } from "./objectNode/parse";
import pako from "pako";
import type { Definition } from "../docs/docs";
import { BaseNode } from "./BaseNode";
import {
  type OperatorContext,
  OperatorContextType,
  getOperatorContext,
  isCompiledType,
} from "./context";
import { createGLFunction } from "./definitions/create";
import type { CompoundOperator, Operator, Statement } from "./definitions/zen/types";
import type { AttributeValue, IOConnection, MessageNode } from "./types";
import type { Node, SerializableCustom, SerializedPatch, Size } from "./types";

import {
  ConnectionType,
  type Coordinate,
  type IOlet,
  type Identifier,
  type InstanceFunction,
  type Lazy,
  type Message,
  type MessageObject,
  type NodeFunction,
  type ObjectNode,
  type Patch,
  type SerializedObjectNode,
  type SubPatch,
} from "./types";
import { type Slot, deserializedSlots } from "./definitions/audio/slots";
import { GenericStepData } from "./definitions/core/zequencer/types";
import { getRootPatch } from "./traverse";
import { evaluate } from "./vm/evaluate";
import { Instruction } from "./vm/types";
import { MatrixType, createMatrixBuffer } from "./definitions/core/matrix";

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
    if (isCompiledType(this.operatorContextType)) return;
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
        n.send(n.outlets[0], [size.width, size.height]);
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
      //evaluate(this.instructions, message);
      this.patch.sendWorkerMessage?.({
        type: "evaluateNode",
        body: {
          nodeId: this.id,
          message: message,
        },
      });

      return;
    }
    //console.log(`%cmain thread object=[${this.text}](${message})`, "color: lime");

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
    };

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
    //if (this.operatorContextType === 0) {
    //delete json.operatorContextType;
    //}
    //        json.attributes = { ... this.attributes };

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
      const { buffer } = createMatrixBuffer(this, json.buffer.length, _type, _buffer);
      this.buffer = buffer as Float32Array;
    }

    this.script = json.script;

    if (json.steps) {
      this.steps = json.steps;
    }

    if (json.saveData) {
      this.storedMessage = json.saveData;
      this.saveData = json.saveData;
    }

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

    for (let i = 0; i < this.audioNode.channelCount; i++) {
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
}
