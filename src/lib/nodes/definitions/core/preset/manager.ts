import { subscribe } from "@/lib/messaging/queue";
import { Node, ObjectNode, Message, MessageNode } from "../../../types";
import { getRootPatch } from "../../../traverse";
import { VMEvaluation } from "@/workers/vm/VM";
import { mergeEvaluation } from "@/workers/utils";
import { StateChange, SerializedPreset, Preset, Slot, SlotToPreset } from "./types";
import { copyPreset, serializePreset } from "./utils";

export class PresetManager {
  objectNode: ObjectNode;
  slots: Slot[];
  slotToPreset: SlotToPreset = {};
  _slotMode: boolean;
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
  lastReceivedPatternCount?: number;
  initialHydrated = false;

  constructor(object: ObjectNode) {
    this.slots = [];
    this.objectNode = object;
    this.voiceToPreset = new Map();
    this.counter = 0;
    this.slotMode = false;
    this.currentPattern = 0;
    this.slotToPreset = {};

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

  set slotMode(mode: boolean) {
    this._slotMode = mode;
    this.setNumberOfSlots((this.objectNode.attributes.slots as number) || 1);
  }

  get slotMode() {
    return this._slotMode;
  }

  setNumberOfSlots(numberOfSlots: number) {
    if (numberOfSlots === this.slots.length) return;

    if (numberOfSlots < this.slots.length) {
      this.slots = this.slots.slice(0, numberOfSlots);
      this.updateUI();
      return;
    }

    for (let i = this.slots.length; i < numberOfSlots; i++) {
      this.slots.push([{}]);
    }
    this.updateUI();
  }

  getZequencerScriptingNames() {
    const zequencerObjects = this.objectNode.attributes.zequencerObjects;
    if (typeof zequencerObjects === "string") {
      return zequencerObjects.split(",");
    }
    return (this.objectNode.attributes.zequencerObjects || []) as string[];
  }

  newPattern() {
    // copy the slots to new pattern and increment currentPattern
    const oldPatternNumber = this.currentPattern;
    const newPatternNumber = this.getNumberOfPatterns();
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const patternPreset = slot[oldPatternNumber];
      const copy = copyPreset(patternPreset);
      slot[newPatternNumber] = copy;
      if (!this.slotToPreset[i]) {
        this.slotToPreset[i] = [];
      }

      // ensure the slot to preset matches previous pattern's value
      this.slotToPreset[i][newPatternNumber] = this.slotToPreset[i]?.[oldPatternNumber] || 0;
    }
    this.currentPattern = this.getNumberOfPatterns() - 1;
    this.lastReceivedPatternCount = this.getNumberOfPatterns();
    this.updateUI();
  }

  deletePattern() {
    const currentPattern = this.currentPattern;
    const numPatterns = this.getNumberOfPatterns();
    if (numPatterns <= 1) return;
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].splice(currentPattern, 1);
    }
    this.switchToPattern(Math.max(0, Math.min(currentPattern, numPatterns - 2)));
    this.lastReceivedPatternCount = this.getNumberOfPatterns();
    this.updateUI();
  }

  setPatternCount(patternCount: number) {
    if (patternCount < 1) {
      return;
    }
    this.lastReceivedPatternCount = patternCount;
    if (patternCount < this.getNumberOfPatterns()) {
      while (patternCount < this.getNumberOfPatterns()) {
        this.deletePattern();
      }
      return;
    } else {
      while (patternCount > this.getNumberOfPatterns()) {
        this.newPattern();
      }
    }
  }

  movePatternTo(sourcePattern: number, targetPosition: number) {
    const numPatterns = this.getNumberOfPatterns();

    // Validate inputs
    if (sourcePattern < 0 || sourcePattern >= numPatterns) return;
    if (targetPosition < 0 || targetPosition >= numPatterns) return;
    if (sourcePattern === targetPosition) return; // No-op

    // Store the pattern data that we're moving
    const movingPatterns: Preset[] = [];
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      movingPatterns[slotIndex] = this.slots[slotIndex][sourcePattern];
    }

    // Store the slotToPreset mappings for the moving pattern
    const movingSlotToPresetMappings: number[] = [];
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      movingSlotToPresetMappings[slotIndex] = this.slotToPreset[slotIndex]?.[sourcePattern] || 0;
    }

    // Remove the pattern from all slots
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      this.slots[slotIndex].splice(sourcePattern, 1);
      if (this.slotToPreset[slotIndex]) {
        this.slotToPreset[slotIndex].splice(sourcePattern, 1);
      }
    }

    // Calculate the actual insertion position after removal
    const insertPosition = sourcePattern < targetPosition ? targetPosition - 1 : targetPosition;

    // Insert the pattern at the new position in all slots
    for (let slotIndex = 0; slotIndex < this.slots.length; slotIndex++) {
      this.slots[slotIndex].splice(insertPosition, 0, movingPatterns[slotIndex]);
      if (!this.slotToPreset[slotIndex]) {
        this.slotToPreset[slotIndex] = [];
      }
      this.slotToPreset[slotIndex].splice(insertPosition, 0, movingSlotToPresetMappings[slotIndex]);
    }

    // Update currentPattern if it was affected by the move
    if (this.currentPattern === sourcePattern) {
      // The current pattern was the one that moved
      this.currentPattern = insertPosition;
    } else if (sourcePattern < targetPosition) {
      // Pattern moved forward - patterns between source and target shift left
      if (this.currentPattern > sourcePattern && this.currentPattern <= targetPosition) {
        this.currentPattern--;
      }
    } else {
      // Pattern moved backward - patterns between target and source shift right
      if (this.currentPattern >= targetPosition && this.currentPattern < sourcePattern) {
        this.currentPattern++;
      }
    }

    this.updateUI();
  }

  getNumberOfPatterns() {
    return this.slots[0]?.length || 0;
  }

  switchToPattern(patternNumber: number) {
    // switch currentPattern and apply each preset
    if (patternNumber >= 0 && patternNumber < this.getNumberOfPatterns()) {
      this.currentPattern = patternNumber;
      for (let i = 0; i < this.slots.length; i++) {
        let slot = this.slots[i];
        const slotPreset = slot[patternNumber];
        // if currentPreset (i.e. what track is selected) is this one (i.e. i) then we should apply the preset
        // otherwise we should only apply the preset to pattern object
        if (this.currentPreset === i) {
          this.applyPreset(slotPreset, undefined, undefined, true);
        } else {
          const zequencer = this.getZequencerScriptingNames()[i];
          this.applyPreset(slotPreset, undefined, undefined, true, zequencer);
        }
        for (const [voice, presetNumber] of this.voiceToPreset.entries()) {
          if (presetNumber === i) {
            // then we need to apply this to voice
            this.applyPreset(slotPreset, voice, 0, false);
          }
        }
      }
    }
    this.updateUI();
  }

  setPresetName(name: string) {
    const presetNumber = this.slotMode
      ? this.slotToPreset[this.currentPreset]?.[this.currentPattern]
      : this.currentPreset;
    if (presetNumber > -1) {
      this.presetNames[presetNumber] = name;
    }
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

  applyPreset(
    preset: Preset,
    voice?: number,
    time?: number,
    isPattern?: boolean,
    zequencerName?: string,
  ) {
    this.switching = true;
    let vmEvaluation: VMEvaluation | undefined;
    const scriptingNames = this.getZequencerScriptingNames();
    for (let id in preset) {
      let { node, state } = preset[id];

      const scriptingName = node.attributes["scripting name"] as string;
      if (!isPattern && scriptingName && scriptingNames.includes(scriptingName)) {
        continue;
      }

      if (isPattern && zequencerName && scriptingName !== zequencerName) {
        // in this case we only wish to execute the pattern object in this preset
        continue;
      }

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
    if (presetNumber !== undefined && slotPreset) {
      this.presets[presetNumber] = copyPreset(slotPreset);
      if (saveAsNew) {
        const oldPresetNumber = this.slotToPreset[slotNumber]?.[this.currentPattern];
        const oldPresetName = this.presetNames[oldPresetNumber];
        this.presetNames[presetNumber] = oldPresetName;

        // Ensure slotToPreset mapping exists
        if (!this.slotToPreset[slotNumber]) {
          this.slotToPreset[slotNumber] = [];
        }
        this.slotToPreset[slotNumber][this.currentPattern] = presetNumber;
      }
    }
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
      const node = _stateChange.node;
      if (this.presetNodes?.has(nodeId)) {
        if (
          this.slotMode &&
          this.objectNode.attributes.patternMode &&
          (node as ObjectNode).name === "zequencer.core"
        ) {
          // we are storing the pattern change directly in the slot associated with that zequencer node
          const slotNumber = this.getZequencerScriptingNames().indexOf(
            node.attributes["scripting name"] as string,
          );
          if (slotNumber > -1) {
            const slot = this.slots[slotNumber];
            if (slot?.[this.currentPattern]) {
              slot[this.currentPattern][_stateChange.node.id] = _stateChange;
            }
          }
        } else {
          if (this.slotMode) {
            const slot = this.slots[this.currentPreset];
            if (slot?.[this.currentPattern]) {
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

    return {
      presets: !this.hydrated ? this.serializedPresets || serializedPresets : serializedPresets,
      slots: !this.hydrated ? this.serializedSlots || serializedSlots : serializedSlots,
      currentPreset: this.currentPreset,
      presetNames: this.presetNames,
      slotToPreset: this.slotToPreset,
      currentPattern: this.currentPattern,
    };
  }

  fromJSON(json: any, force?: boolean) {
    if (json.presets) {
      this.serializedPresets = json.presets;
    }
    if (json.slots) {
      this.serializedSlots = json.slots;
    }
    if (json.currentPattern) {
      this.currentPattern = json.currentPattern;
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

    if (!this.objectNode.patch.vm && force) {
      // we are on main-thread so we hydrate directly
      const objects = this.objectNode.patch.getAllNodes();
      const messages = this.objectNode.patch.getAllMessageNodes();
      const allNodes = [...objects, ...messages];
      this.hydrateSerializedPresets(allNodes);
    }
  }

  // ensures each preset contains a reference to the nodes it applies to
  hydrateSerializedPresets(allNodes: Node[]) {
    console.log("HYDRATE CALLED! ******************************", this.getNumberOfPatterns(), this);
    if (this.initialHydrated && this.objectNode.patch.vm) {
      console.log("skipping hydration");
      return;
    }
    const scriptingNames = this.getZequencerScriptingNames();
    if (this.serializedPresets) {
      for (let i = 0; i < this.serializedPresets.length; i++) {
        let preset = this.serializedPresets[i];
        for (let id in preset) {
          let { state } = preset[id];
          let node = allNodes.find((x) => x.id === id);
          if (node) {
            if (scriptingNames.includes(node.attributes["scripting name"] as string)) {
              continue;
            }
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
              const scriptingIndex = scriptingNames.indexOf(
                node.attributes["scripting name"] as string,
              );
              if (scriptingIndex > -1 && scriptingIndex !== i) {
                // this belongs to a zequencer object it shouldn't be controlling
                continue;
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
          this.slots[i] = this.slots[i].slice(0, slot.length);
        }
      }
    }
    if (this.lastReceivedPatternCount !== undefined) {
      this.setPatternCount(this.lastReceivedPatternCount);
    }
    this.hydrated = true;
    this.initialHydrated = true;
    this.objectNode.updateWorkerState();
    this.updateUI();
  }

  deletePreset(presetNumber: number) {
    this.presets[presetNumber] = {};
    this.presetNames[presetNumber] = "";
    if (this.buffer) {
      this.buffer[presetNumber] = 0;
    }
    this.updateUI();
  }

  updateUI() {
    this.objectNode.onNewValue?.([
      this.currentPreset,
      this.presetNames,
      this.slotToPreset,
      this.currentPattern,
      this.getNumberOfPatterns(),
    ]);
  }

  execute() {}
}
