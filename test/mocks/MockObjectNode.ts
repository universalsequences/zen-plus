import { registerUUID, uuid } from "@/lib/uuid/IDGenerator";
import { parse } from "@/lib/nodes/objectNode/parse";
import type { Definition } from "../../src/lib/docs/docs";
import { type OperatorContext, OperatorContextType, getOperatorContext } from "@/lib/nodes/context";
import {
  type Node,
  type ObjectNode,
  type Identifier,
  type MessageObject,
  type SubPatch,
  type Size,
  type SerializableCustom,
  type Patch,
  type IOlet,
  type Coordinate,
  type InstanceFunction,
  type Message,
  type SerializedPatch,
  ConnectionType,
  SerializedObjectNode,
  IOConnection,
  AttributeValue,
} from "../../src/lib/nodes/types";
import { Instruction } from "@/lib/nodes/vm/types";
import { Slot, deserializedSlots } from "@/lib/nodes/definitions/audio/slots";
import { MockBaseNode } from "./MockBaseNode";
import { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { getRootPatch } from "@/lib/nodes/traverse";
import { Operator, Statement } from "@/lib/nodes/definitions/zen/types";

export class MockObjectNode extends MockBaseNode implements ObjectNode {
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
  steps?: GenericStepData[][];
  skipCompilation?: boolean;
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

  updateWorkerState() {}

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

  parse(
    _text: string,
    contextType: OperatorContextType = this.operatorContextType,
    compile = true,
    patchPreset?: SerializedPatch,
  ): boolean {
    return parse(this, _text, contextType, compile, patchPreset);
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
    if (typeof message === "string" && message !== "bang") {
      const tokens = message.split(" ").filter((x) => x.length > 0);
      const attributeName = tokens[0];
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

  useAudioNode(audioNode: AudioNode) {}

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
      const _type = json.attributes.type;
      this.buffer =
        _type === "uint8"
          ? new Uint8Array(json.buffer as number[])
          : _type === "object"
            ? (json.buffer as MessageObject[])
            : new Float32Array(json.buffer as number[]);
    }

    this.script = json.script;

    if (json.steps) {
      this.steps = json.steps;
    }

    if (json.saveData) {
      this.storedMessage = json.saveData;
      //this.saveData = json.saveData;
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

    this.id = json.id;

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

    /*
    if (json.slots) {
      deserializedSlots(this, json.slots);
    }
    */
  }

  resetCompilationState() {}
}
