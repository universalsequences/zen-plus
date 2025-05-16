import { doc } from "./doc";
import { subscribe } from "@/lib/messaging/queue";
import {
  Node,
  ObjectNode,
  Message,
  Patch,
  SubPatch,
  MessageNode,
  AttributeValue,
} from "../../types";
import { compileVM } from "../../vm/forwardpass";
import { MockObjectNode } from "../../../../../test/mocks/MockObjectNode";
import { getRootPatch } from "../../traverse";
import ObjectNodeImpl from "../../ObjectNode";
import { VMEvaluation } from "@/workers/vm/VM";
import { mergeEvaluation } from "@/workers/utils";

doc("preset", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "preset system",
});

export interface StateChange {
  node: Node;
  state: any;
}

export interface SerializedStateChange {
  id: string;
  state: any;
}

export type SerializedPreset = {
  [x: string]: SerializedStateChange;
};

export type Preset = {
  [x: string]: StateChange;
};

export type Slot = Preset[];

export type SlotToPreset = { [slotNumber: number]: number[] };

const copyPreset = (preset: Preset) => {
  const copied: Preset = {};
  for (const id in preset) {
    const state = preset[id];
    if (typeof state === "object") {
      copied[id] = { ...state };
    } else {
      copied[id] = state;
    }
  }
  return copied;
};

export class PresetManager {
  objectNode: ObjectNode;
  slots: Slot[];
  slotToPreset: SlotToPreset = {};
  slotMode: boolean;
  currentPattern: number;
  presets: Preset[];
  serializedPresets?: SerializedPreset[];
  serializedSlots?: SerializedPreset[][];
  currentPreset: number;
  value: Message;
  switching = false;
  presetNodes?: Set<string>;
  sharedBuffer?: SharedArrayBuffer;
  buffer?: Uint8Array;
  hydrated = true;
  currentVoicePreset?: number;
  voiceToPreset: Map<number, number>;
  counter: number;
  presetNames: string[];

  constructor(object: ObjectNode) {
    this.objectNode = object;
    this.voiceToPreset = new Map();
    this.counter = 0;
    this.slotMode = false;
    this.currentPattern = 0;
    this.slotToPreset = {};
    this.slots = [];
    this.setNumberOfSlots(4);

    this.presetNames = [];
    this.presets = [];
    for (let i = 0; i < 64; i++) {
      this.presets[i] = {};
      this.presetNames[i] = "";
    }
    this.currentPreset = 0;
    this.value = 0;

    // use message passing
    this.listen();
    this.notifyVM();
  }

  setNumberOfSlots(numberOfSlots: number) {
    this.slots = [];
    for (let i = 0; i < numberOfSlots; i++) {
      this.slots.push([{}]);
    }
  }

  setPresetName(name: string) {
    const presetNumber = this.slotMode
      ? this.slotToPreset[this.currentPreset]?.[this.currentPattern]
      : this.currentPreset;
    console.log(
      "set preset name presetNumber=%s name=%s",
      presetNumber,
      name,
      this.slotToPreset,
      this.slotMode,
      this.slotToPreset[this.currentPreset],
    );
    if (presetNumber > -1) {
      this.presetNames[presetNumber] = name;
    }
    console.log("preset names is now=", this.presetNames);
  }

  notifyVM() {
    // register object in WorkerContext.ts (i.e. the main-thread)
    // fetches related nodes that are governed by this preset

    getRootPatch(this.objectNode.patch)?.registerNodes?.([this.objectNode], []);

    // register object in Worker itself, by sending a serialized version of itself there
    this.objectNode.updateWorkerState();

    setTimeout(() => {
      const objectNodes = this.objectNode.patch.getAllNodes();
      const messageNodes = this.objectNode.patch.getAllMessageNodes();
      const nodes = [...objectNodes, ...messageNodes];
      const nodeIds = nodes.map((x) => x.id);
      const nodeId = this.objectNode.id;
      this.objectNode.patch.sendWorkerMessage?.({
        type: "setPresetNodes",
        body: {
          nodeId,
          nodeIds,
        },
      });
    }, 100);

    // this occurs in the worker thread
    if (this.objectNode.onNewSharedBuffer) {
      // create the SharedArrayBuffer that will act as glue to UI
      const bytesPerElement = Uint8Array.BYTES_PER_ELEMENT;

      const size = 64;
      if (!this.sharedBuffer) {
        this.sharedBuffer = new SharedArrayBuffer(bytesPerElement * size);
        this.buffer = new Uint8Array(this.sharedBuffer);
        this.buffer[this.currentPreset] = 2;
      }
      this.objectNode.onNewSharedBuffer(this.sharedBuffer);
    }
  }

  newPreset() {
    let oldPreset = { ...this.presets[this.currentPreset] };
    this.currentPreset++;
    this.presets[this.currentPreset] = { ...oldPreset };
  }

  applyPreset(preset: Preset, voice?: number, time?: number) {
    this.switching = true;
    let vmEvaluation: VMEvaluation | undefined;
    for (let id in preset) {
      let { node, state } = preset[id];

      const objectNode = node as ObjectNode;
      if (objectNode.custom) {
        if (
          (node as MessageNode | ObjectNode).attributes["scripting name"] !== "" ||
          (node as ObjectNode).name === "attrui"
        ) {
          // only nodes with scripting name or attrui
          // TODO
          const currentEvaluation = objectNode.custom.fromJSON(state, undefined, voice, time);
          if (currentEvaluation) {
            if (vmEvaluation) {
              vmEvaluation = mergeEvaluation(vmEvaluation, currentEvaluation);
            } else {
              vmEvaluation = currentEvaluation;
            }
          }
        }
      } else {
        // todo -- handle other nodes other than number
        if (node.patch.vm) {
          try {
            const evaluation = node.patch.vm.evaluateNode(node.id, state);
            if (evaluation) {
              evaluation.replaceMessages.push({
                messageId: node.id,
                message: state,
              });
              node.patch.vm.sendEvaluationToMainThread?.(evaluation);
            }
          } catch (e) {
            // ignore error (if no instructions are found)
          }
        } else {
          node.receive(node.inlets[1], state);
          node.receive(node.inlets[0], "bang");
        }
      }
    }
    if (vmEvaluation) {
      this.objectNode.patch.vm?.sendEvaluationToMainThread?.(vmEvaluation, true, true);
    }
    this.switching = false;
  }

  copyToSlot(presetNumber: number, slotNumber: number) {
    let preset = this.presets[presetNumber];
    if (!this.slots?.[slotNumber]) {
      this.slots[slotNumber] = [];
    }
    let slot = this.slots?.[slotNumber];
    if (slot && preset) {
      slot[this.currentPattern] = copyPreset(preset);
      // store the mapping of slot -> preset
      if (!this.slotToPreset[slotNumber]) {
        this.slotToPreset[slotNumber] = [];
      }
      this.slotToPreset[slotNumber][this.currentPattern] = presetNumber;
      this.currentPreset = slotNumber;
      this.applyPreset(preset);
      for (const [voice, presetNumber] of this.voiceToPreset.entries()) {
        if (presetNumber === slotNumber) {
          // then we need to apply this to voice
          this.applyPreset(preset, voice, 0);
        }
      }
    }
  }

  writeToMemory(slotNumber: number, saveAsNew = false) {
    const presetNumber = saveAsNew
      ? this.presets.findIndex((x, i) => Object.keys(x).length === 0)
      : this.slotToPreset[slotNumber]?.[this.currentPattern];
    const slotPreset = this.slots[slotNumber]?.[this.currentPattern];
    console.log(
      "write to memory slot=%s presetNumber=%s",
      slotNumber,
      presetNumber,
      slotPreset,
      this.slots,
      this.presets,
    );
    if (presetNumber !== undefined && slotPreset) {
      console.log("copying slot to preset", presetNumber, slotPreset);
      this.presets[presetNumber] = copyPreset(slotPreset);
      console.log("copied became=", this.presets);
      if (saveAsNew) {
        const oldPresetNumber = this.slotToPreset[slotNumber]?.[this.currentPattern];
        const oldPresetName = this.presetNames[oldPresetNumber];
        this.presetNames[presetNumber] = oldPresetName;
        console.log("setting slot to preset to new preset number");
        this.slotToPreset[slotNumber][this.currentPattern] = presetNumber;
      }
    }
  }

  newPattern() {
    // copies the preset in each slot's current pattern to a new pattern
  }

  switchToPreset(presetNumber: number, voice?: number, time?: number) {
    if (voice !== undefined && this.voiceToPreset.get(voice) === presetNumber) {
      this.currentVoicePreset = presetNumber;
      if (this.counter++ > 40) {
        // this somehow fixes "loading"
        return;
      }
    }
    const oldPreset = this.currentPreset;
    if (oldPreset !== undefined && this.buffer && voice === undefined) {
      const hadPresets = Object.keys(this.presets[oldPreset]).length > 0;
      this.buffer[oldPreset] = hadPresets ? 1 : 0;
      this.buffer[presetNumber] = 2;
    }
    if (voice !== undefined) {
      this.currentVoicePreset = presetNumber;
      this.voiceToPreset.set(voice, presetNumber);
    }
    let old = this.presets[this.currentPreset];

    // if we're in slot mode, we use the presets stored in slots (for the current pattern)
    const slotPreset = this.slots?.[presetNumber]?.[this.currentPattern];
    let preset = this.slotMode && slotPreset ? slotPreset : this.presets[presetNumber];
    if (Object.keys(old).length > 0 && Object.keys(preset).length === 0) {
      // old preset had a preset & new one is empty so lets copy it over
      this.presets[presetNumber] = {
        ...old,
      };
      preset = this.presets[presetNumber];
    }
    if (preset) {
      if (voice === undefined) {
        this.currentPreset = presetNumber;
      }
      this.applyPreset(preset, voice, time);
    }
    this.switching = false;
  }

  handleVoiceStateChange(stateChange: StateChange, presetNumber: number) {
    const { node, state } = stateChange;

    let vmEvaluation: VMEvaluation | undefined;
    for (const [voice, preset] of this.voiceToPreset.entries()) {
      if (preset === presetNumber) {
        const currentEvaluation = node.custom?.fromJSON(state, undefined, voice, 0);
        if (currentEvaluation) {
          if (vmEvaluation) {
            vmEvaluation = mergeEvaluation(vmEvaluation, currentEvaluation);
          } else {
            vmEvaluation = currentEvaluation;
          }
        }
      }
    }
    if (vmEvaluation) {
      this.objectNode.patch.vm?.sendEvaluationToMainThread?.(vmEvaluation);
    }
  }

  listen() {
    subscribe("statechanged", (stateChange: Message) => {
      if (this.switching) {
        return;
      }
      let _stateChange = stateChange as StateChange;

      if (
        (_stateChange.node as MessageNode | ObjectNode).attributes["scripting name"] === "" &&
        (_stateChange.node as ObjectNode).name !== "attrui"
      ) {
        return;
      }

      // ensure that the preset is "above" the object emitting the message
      // in the patch hierarchy
      let nodeId = _stateChange.node.id;
      if (this.presetNodes?.has(nodeId)) {
        if (this.slotMode) {
          const slot = this.slots[this.currentPreset];
          if (slot) {
            slot[this.currentPattern][_stateChange.node.id] = _stateChange;
          }
        } else {
          this.presets[this.currentPreset][_stateChange.node.id] = _stateChange;
        }
        if (this.currentPreset !== undefined) {
          this.handleVoiceStateChange(_stateChange, this.currentPreset);
        }
        if (this.buffer && this.buffer[this.currentPreset] !== 2) {
          this.buffer[this.currentPreset] = 1;
        }
      }
    });
  }

  getJSON() {
    let serializedPresets: SerializedPreset[] = [];
    for (let preset of this.presets) {
      serializedPresets.push(serializePreset(preset));
    }
    const serializedSlots: SerializedPreset[][] = [];
    for (const slot of this.slots) {
      const serializedSlot: SerializedPreset[] = [];
      for (const preset of slot) {
        serializedSlot.push(serializePreset(preset));
      }
      serializedSlots.push(serializedSlot);
    }

    const json = {
      presets: !this.hydrated ? this.serializedPresets || serializedPresets : serializedPresets,
      slots: !this.hydrated ? this.serializedSlots || serializedSlots : serializedSlots,
      currentPreset: this.currentPreset,
      presetNames: this.presetNames,
      slotToPreset: this.slotToPreset,
    };
    return json;
  }

  fromJSON(json: any, force?: boolean) {
    if (json.presets) {
      this.serializedPresets = json.presets;
    }
    if (json.slots) {
      this.serializedSlots = json.slots;
    }
    if (json.currentPreset !== undefined) {
      this.currentPreset = json.currentPreset;
      if (this.buffer) {
        this.buffer[0] = 0;
        this.buffer[this.currentPreset] = 2;
      }
    }

    if (json.presetNames) {
      this.presetNames = json.presetNames as string[];
    }
    if (json.slotToPreset) {
      this.slotToPreset = json.slotToPreset;
    }

    this.hydrated = false;
    if (this.objectNode instanceof ObjectNodeImpl && force) {
      const objects = this.objectNode.patch.getAllNodes();
      const messages = this.objectNode.patch.getAllMessageNodes();
      const allNodes = [...objects, ...messages];
      this.hydrateSerializedPresets(allNodes);
    }
  }

  // ensures each preset contains a reference to the nodes it applies to
  hydrateSerializedPresets(allNodes: Node[]) {
    if (this.serializedPresets) {
      for (let i = 0; i < this.serializedPresets.length; i++) {
        let preset = this.serializedPresets[i];
        for (let id in preset) {
          let { state } = preset[id];
          let node = allNodes.find((x) => x.id === id);
          if (node) {
            this.presets[i][id] = {
              node,
              state,
            };

            if (this.buffer && this.buffer[i] !== 2) {
              this.buffer[i] = 1;
            } else {
            }
          } else {
          }
        }
      }
    }
    if (this.serializedSlots) {
      for (let i = 0; i < this.serializedSlots.length; i++) {
        const slot = this.serializedSlots[i];
        for (let j = 0; j < slot.length; j++) {
          const preset = slot[j];
          for (const id in preset) {
            let { state } = preset[id];
            let node = allNodes.find((x) => x.id === id);
            if (node) {
              if (!this.slots[i]) {
                this.slots[i] = [];
              }
              if (!this.slots[i][j]) {
                this.slots[i][j] = {};
              }
              this.slots[i][j][id] = {
                node,
                state,
              };
            }
          }
        }
      }
    }
    this.hydrated = true;
    this.objectNode.updateWorkerState();
    this.updateUI();
  }

  deletePreset(presetNumber: number) {
    this.presets[presetNumber] = {};
    if (this.buffer) {
      this.buffer[presetNumber] = 0;
    }
  }

  updateUI() {
    this.objectNode.onNewValue?.([
      this.currentPreset,
      this.presetNames,
      this.slotToPreset,
      this.currentPattern,
    ]);
  }

  execute() {}
}

export const preset = (object: ObjectNode) => {
  object.isResizable = true;
  if (!object.attributes.showNames) {
    object.attributes.showNames = false;
  }
  if (!object.attributes.slotMode) {
    object.attributes.slotMode = false;
  }
  if (!object.attributes.slots) {
    object.attributes.slots = 4;
  }

  object.attributeCallbacks.slots = (message: AttributeValue) => {
    const mgmt = object.custom as PresetManager;
    if (typeof message === "number" && mgmt) {
      mgmt.setNumberOfSlots(message);
    }
  };

  object.attributeCallbacks.slotMode = (message: AttributeValue) => {
    const mgmt = object.custom as PresetManager;
    if (typeof message === "boolean" && mgmt) {
      mgmt.slotMode = message;
    }
  };

  if (!object.custom) {
    object.custom = new PresetManager(object);
  }

  if (object.attributes.slotMode) {
    const mgmt = object.custom as PresetManager;
    if (mgmt) {
      mgmt.slotMode = true;
    }
  }

  const updateUI = () => {
    const mgmt = object.custom as PresetManager;
    if (mgmt) {
      if (object.onNewValue) {
        object.onNewValue([
          mgmt.currentPreset,
          mgmt.presetNames,
          mgmt.slotToPreset,
          mgmt.currentPattern,
        ]);
      }
    }
  };
  return (x: Message) => {
    console.log("preset received=", x);
    const mgmt = object.custom as PresetManager;
    if (x === "update-ui") {
      updateUI();
      return [];
    }
    if (mgmt) {
      if (typeof x === "number") {
        mgmt.switchToPreset(Math.round(x as number));
        updateUI();
      } else if (Array.isArray(x) && x[0] === "delete") {
        for (let i = 1; i < x.length; i++) {
          mgmt.deletePreset(i);
        }
      } else if (Array.isArray(x) && x[0] === "set-name") {
        mgmt.setPresetName(x[1] as string);
        updateUI();
      } else if (Array.isArray(x) && x[0] === "switch-to-pattern") {
      } else if (x === "write-to-memory") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot);
      } else if (x === "save-as-new") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot, true);
        updateUI();
      } else if (Array.isArray(x) && x[0] === "copy-to-slot") {
        const currentSlot = mgmt.currentPreset;
        const presetNumber = x[1] as number;
        mgmt.copyToSlot(presetNumber, currentSlot);
        updateUI();
      } else if (typeof x === "object" && "voice" in x && "preset" in x && "time" in x) {
        const { voice, preset, time } = x;
        mgmt.switchToPreset(Math.round(preset as number), voice as number, time as number);
      }
    }
    return [];
  };
};

const serializePreset = (preset: Preset) => {
  let _p: SerializedPreset = {};
  for (let id in preset) {
    _p[id] = { id, state: preset[id].state };
  }
  return _p;
};
