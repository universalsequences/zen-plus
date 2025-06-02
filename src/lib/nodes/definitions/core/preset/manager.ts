import { subscribe } from "@/lib/messaging/queue";
import { Node, ObjectNode, Message, MessageNode } from "../../../types";
import { getRootPatch } from "../../../traverse";
import { VMEvaluation } from "@/workers/vm/VM";
import { mergeEvaluation } from "@/workers/utils";
import type {
  StaticMappedSlotNodes,
  StateChange,
  SerializedPreset,
  Preset,
  Slot,
  SlotToPreset,
  PresetOperation,
  PLockUndoOperation,
  PLockApplyOperation,
  VoiceTrackingOperation,
  PresetCopyOperation,
  PresetApplyOperation,
  BufferUpdateOperation,
} from "./types";
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
  serializedStepParameterLocks?: { [stepId: string]: SerializedPreset };
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
  staticMappedSlotNodes: StaticMappedSlotNodes;
  hydratedAt?: number;
  selectedSteps: string[] = [];
  stepParameterLocks: { [stepId: string]: Preset } = {};
  preStepSelectionState?: { pattern: number; slot: number } = undefined;
  currentVoicePLocks: Map<number, { stepId: string; pLocks: Preset }> = new Map();

  constructor(object: ObjectNode) {
    this._slotMode = false;
    this.slots = [];
    this.staticMappedSlotNodes = {};
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
    if (!this.hydrated) {
      return;
    }
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
          // can probably get rid of this
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

  setSelectedSteps(stepIds: string[]) {
    const hadPreviousSelection = this.selectedSteps.length > 0;
    const hasNewSelection = stepIds.length > 0;

    // If we're starting a new selection (from no selection) store current state
    if (!hadPreviousSelection && hasNewSelection) {
      this.preStepSelectionState = {
        pattern: this.currentPattern,
        slot: this.slotMode ? this.currentPreset : this.currentPreset,
      };
    }

    // If we had a previous selection or stored state, restore the original preset first
    if ((hadPreviousSelection || this.preStepSelectionState) && this.preStepSelectionState) {
      if (this.slotMode) {
        // In slot mode, apply the preset from the stored slot and pattern
        const slotPreset =
          this.slots?.[this.preStepSelectionState.slot]?.[this.preStepSelectionState.pattern];
        if (slotPreset) {
          this.applyPreset(slotPreset);
        }
      } else {
        // In regular preset mode, apply the stored preset
        const preset = this.presets[this.preStepSelectionState.slot];
        if (preset) {
          this.applyPreset(preset);
        }
      }

      // Only clear the stored state if we're going to no selection
      if (!hasNewSelection) {
        this.preStepSelectionState = undefined;
      }
    }

    this.selectedSteps = stepIds;

    // If we have new selection, check if any of the selected steps have p-locks and apply them
    if (hasNewSelection) {
      // Merge all p-locks from selected steps to create a combined preset
      const combinedPLocks: Preset = {};
      let hasAnyPLocks = false;

      for (const stepId of stepIds) {
        const stepPLocks = this.stepParameterLocks[stepId];
        if (stepPLocks && Object.keys(stepPLocks).length > 0) {
          hasAnyPLocks = true;
          // Merge this step's p-locks into the combined preset
          Object.assign(combinedPLocks, stepPLocks);
        }
      }

      if (hasAnyPLocks) {
        this.applyPreset(combinedPLocks);
      }
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
    slotNumber?: number,
    skipNodeIds?: Set<string>,
  ) {
    this.switching = true;
    let vmEvaluation: VMEvaluation | undefined;
    const scriptingNames = this.getZequencerScriptingNames();

    for (const id in this.staticMappedSlotNodes) {
      const { slot, state } = this.staticMappedSlotNodes[id];
      const node = state.node as ObjectNode;
      if (node.custom && voice !== undefined) {
        for (const [voiceNumber, presetNumber] of this.voiceToPreset.entries()) {
          if (presetNumber === slot) {
            // then we are in the right voice + slot combo
            // in this case
            const currentEvaluation = node.custom.fromJSON(1, undefined, voiceNumber, time);
            if (currentEvaluation) {
              if (vmEvaluation) {
                vmEvaluation = mergeEvaluation(vmEvaluation, currentEvaluation);
              } else {
                vmEvaluation = currentEvaluation;
              }
            }
          } else {
            // otherwise set it to zero yall
            const currentEvaluation = node.custom.fromJSON(0, undefined, voiceNumber, time);
            if (currentEvaluation) {
              if (vmEvaluation) {
                vmEvaluation = mergeEvaluation(vmEvaluation, currentEvaluation);
              } else {
                vmEvaluation = currentEvaluation;
              }
            }
          }
        }
      }
    }

    for (let id in preset) {
      if (!preset[id]) {
        delete preset[id];
        continue;
      }
      if (this.staticMappedSlotNodes[id]) {
        continue;
      }

      // Skip this parameter if it's in the skipNodeIds set (used for p-locks)
      if (skipNodeIds?.has(id)) {
        continue;
      }

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
      this.objectNode.patch.vm?.sendEvaluationToMainThread?.(vmEvaluation, true);
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
      const copied = copyPreset(preset);
      slot[this.currentPattern] = copied;
      // store the mapping of slot -> preset
      if (!this.slotToPreset[slotNumber]) {
        this.slotToPreset[slotNumber] = [];
      }
      this.slotToPreset[slotNumber][this.currentPattern] = presetNumber;
      this.currentPreset = slotNumber;
      this.applyPreset(copied);
      for (const [voice, presetNumber] of this.voiceToPreset.entries()) {
        if (presetNumber === slotNumber) {
          // then we need to apply this to voice
          this.applyPreset(copied, voice, 0);
        }
      }
    }
  }

  writeToMemory(slotNumber: number, saveAsNew = false) {
    let presetNumber = saveAsNew
      ? this.presets.findIndex((x, i) => Object.keys(x).length === 0)
      : this.slotToPreset[slotNumber]?.[this.currentPattern];
    if (presetNumber === -1) {
      presetNumber = this.presets.length;
    }
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

  generatePresetOperations(
    presetNumber: number,
    voice?: number,
    time?: number,
    stepId?: string,
  ): PresetOperation[] {
    const operations: PresetOperation[] = [];

    // Handle p-lock logic for voices
    if (voice !== undefined) {
      // Check if we need to undo previous p-locks for this voice
      const currentPLocks = this.currentVoicePLocks.get(voice);
      const newPLocks = stepId && (this.stepParameterLocks[stepId] as Preset);

      if (currentPLocks) {
        // Get the base preset to undo with
        const slotNumber = presetNumber;
        const slotPreset = this.slots?.[slotNumber]?.[this.currentPattern];
        let basePreset = this.slotMode && slotPreset ? slotPreset : this.presets[presetNumber];

        if (basePreset) {
          // Only undo parameters that are NOT in the new p-locks (to avoid conflicts)
          const undoPreset: Preset = {};

          for (const nodeId of Object.keys(currentPLocks.pLocks)) {
            const currentPLockState = currentPLocks.pLocks[nodeId];
            const newPLockState = (newPLocks as Preset)?.[nodeId];
            const baseState = basePreset[nodeId];

            if (!newPLockState) {
              undoPreset[nodeId] = baseState;
            }
          }

          if (Object.keys(undoPreset).length > 0) {
            operations.push({
              type: "plock_undo",
              voice,
              preset: undoPreset,
              time,
            });
          }
        }
      }
    }

    // Voice tracking operations
    /*
    if (voice !== undefined && this.voiceToPreset.get(voice) === presetNumber) {
      if (this.counter++ > 40) {
        // Early return if counter limit reached
        return operations;
      }
    }
    */

    // Buffer update operations for main thread (not voice-specific)
    const oldPreset = this.currentPreset;
    if (oldPreset !== undefined && this.buffer && voice === undefined) {
      operations.push({
        type: "buffer_update",
        oldPresetNumber: oldPreset,
        newPresetNumber: presetNumber,
      });
    }

    // Voice tracking operation
    if (voice !== undefined) {
      operations.push({
        type: "voice_tracking",
        voice,
        presetNumber,
      });
    }

    // Get the target preset (slot mode vs regular mode)
    const slotNumber = presetNumber;
    const slotPreset = this.slots?.[slotNumber]?.[this.currentPattern];
    let preset = this.slotMode && slotPreset ? slotPreset : this.presets[presetNumber];

    // Handle preset copying if old has data but new is empty
    let old = this.presets[this.currentPreset];
    if (Object.keys(old).length > 0 && Object.keys(preset).length === 0) {
      operations.push({
        type: "preset_copy",
        fromPreset: old,
        toPresetNumber: presetNumber,
      });
      preset = { ...old };
    }

    // Main preset application - exclude parameters that are p-locked
    //if (voice !== undefined && this.voiceToPreset.get(voice) === presetNumber) {
    if (preset && (voice === undefined || this.voiceToPreset.get(voice) !== presetNumber)) {
      let filteredPreset = preset;

      // Get current step p-locks for filtering
      const currentStepPLocks = stepId && this.stepParameterLocks[stepId];

      // If we have p-locks for this step, filter out p-locked parameters from main preset
      if (voice !== undefined && currentStepPLocks && Object.keys(currentStepPLocks).length > 0) {
        filteredPreset = {};

        for (const nodeId in preset) {
          const presetState = preset[nodeId];
          const pLockState = currentStepPLocks[nodeId];

          if (
            pLockState &&
            pLockState.state &&
            typeof pLockState.state === "object" &&
            presetState.state &&
            typeof presetState.state === "object"
          ) {
            // Filter out p-locked parameters from this node's preset
            const filteredState: any = {};
            let hasNonPLockedParams = false;

            for (const paramName in presetState.state) {
              if (!pLockState.state.hasOwnProperty(paramName)) {
                filteredState[paramName] = presetState.state[paramName];
                hasNonPLockedParams = true;
              }
            }

            if (hasNonPLockedParams) {
              filteredPreset[nodeId] = {
                node: presetState.node,
                state: filteredState,
              };
            }
          } else {
            // No p-locks for this node, include entire preset
            filteredPreset[nodeId] = presetState;
          }
        }
      }

      // Only add preset_apply if there are parameters to apply
      if (Object.keys(filteredPreset).length > 0) {
        operations.push({
          type: "preset_apply",
          preset: filteredPreset,
          voice,
          time,
        });
      }
    }

    // Apply new p-locks AFTER main preset (so p-locks override preset parameters)
    if (voice !== undefined) {
      const newPLocks = stepId && this.stepParameterLocks[stepId];
      if (newPLocks && Object.keys(newPLocks).length > 0) {
        operations.push({
          type: "plock_apply",
          voice,
          preset: newPLocks,
          stepId,
          time,
        });
      }
    }

    return operations;
  }

  executePresetOperations(operations: PresetOperation[], presetNumber: number, voice?: number) {
    // Collect all node IDs that will be handled by p-locks to skip in main preset
    const pLockNodeIds = new Set<string>();
    for (const operation of operations) {
      if (operation.type === "plock_apply") {
        for (const nodeId in operation.preset) {
          pLockNodeIds.add(nodeId);
        }
      }
    }

    for (const operation of operations) {
      switch (operation.type) {
        case "plock_undo":
          this.applyPreset(operation.preset, operation.voice, operation.time);
          break;

        case "plock_apply":
          this.applyPreset(operation.preset, operation.voice, operation.time);
          // Track these p-locks as current for this voice
          this.currentVoicePLocks.set(operation.voice, {
            stepId: operation.stepId,
            pLocks: operation.preset,
          });
          break;

        case "voice_tracking":
          this.currentVoicePreset = operation.presetNumber;
          this.voiceToPreset.set(operation.voice, operation.presetNumber);
          break;

        case "buffer_update":
          if (this.buffer) {
            const hadPresets = Object.keys(this.presets[operation.oldPresetNumber]).length > 0;
            this.buffer[operation.oldPresetNumber] = hadPresets ? 1 : 0;
            this.buffer[operation.newPresetNumber] = 2;
          }
          break;

        case "preset_copy":
          this.presets[operation.toPresetNumber] = { ...operation.fromPreset };
          break;

        case "preset_apply":
          if (voice === undefined) {
            this.currentPreset = presetNumber;
          }
          // Skip nodes that will be handled by p-locks to avoid undefined behavior
          this.applyPreset(
            operation.preset,
            operation.voice,
            operation.time,
            false,
            undefined,
            undefined,
            pLockNodeIds,
          );
          break;
      }
    }
  }

  switchToPreset(presetNumber: number, voice?: number, time?: number, stepId?: string) {
    // Generate and execute the operations
    // (we need currentVoicePLocks intact to generate undo operations)
    const operations = this.generatePresetOperations(presetNumber, voice, time, stepId);
    this.executePresetOperations(operations, presetNumber, voice);

    this.switching = false;
  }

  handleVoiceStateChange(stateChange: StateChange, presetNumber: number) {
    const { node, state } = stateChange;

    let vmEvaluation: VMEvaluation | undefined;
    for (const [voice, preset] of this.voiceToPreset.entries()) {
      if (preset === presetNumber) {
        const currentEvaluation = (node as ObjectNode).custom?.fromJSON(state, undefined, voice, 0);
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
      if (this.switching || !this.hydrated) {
        return;
      }
      if (this.hydratedAt && new Date().getTime() - this.hydratedAt < 1000) {
        // for some reason we get a lot of state changes right after hydration
        // need to test whether switch a pattern causes state changes
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
        // Check if we should store this as a step-specific parameter lock
        if (this.selectedSteps.length > 0 && (node as ObjectNode).text !== "zequencer.core") {
          // Store the parameter change for each selected step
          for (const stepId of this.selectedSteps) {
            if (!this.stepParameterLocks[stepId]) {
              this.stepParameterLocks[stepId] = {};
            }
            this.stepParameterLocks[stepId][_stateChange.node.id] = _stateChange;
          }
        } else {
          // Normal preset behavior when no steps are selected
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
              if (slot && !slot[this.currentPattern]) {
                slot[this.currentPattern] = {};
              }
              if (slot?.[this.currentPattern]) {
                slot[this.currentPattern][_stateChange.node.id] = _stateChange;
              }
            }
          } else {
            if (this.slotMode) {
              const optionalNodeSlot =
                (node as ObjectNode).name === "attrui"
                  ? (node.attributes.slot as number | string | undefined)
                  : undefined;
              if (optionalNodeSlot !== undefined && optionalNodeSlot !== "") {
                // we need to map
                this.staticMappedSlotNodes[node.id] = {
                  state: _stateChange,
                  slot: Number.parseInt(optionalNodeSlot as string),
                };
              } else {
                const slot = this.slots[this.currentPreset];
                if (slot?.[this.currentPattern]) {
                  slot[this.currentPattern][_stateChange.node.id] = _stateChange;
                }
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
    const serializedStepParameterLocks: { [stepId: string]: SerializedPreset } = {};
    for (const [stepId, preset] of Object.entries(this.stepParameterLocks)) {
      serializedStepParameterLocks[stepId] = serializePreset(preset);
    }

    const json = {
      presets: !this.objectNode.patch.vm
        ? this.serializedPresets || serializedPresets
        : serializedPresets,
      slots: !this.objectNode.patch.vm ? this.serializedSlots || serializedSlots : serializedSlots,
      stepParameterLocks: !this.objectNode.patch.vm
        ? this.serializedStepParameterLocks || serializedStepParameterLocks
        : serializedStepParameterLocks,
      currentPreset: this.currentPreset,
      presetNames: this.presetNames,
      slotToPreset: this.slotToPreset,
      currentPattern: this.currentPattern,
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
    if (json.stepParameterLocks) {
      this.serializedStepParameterLocks = json.stepParameterLocks;
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
    if (this.initialHydrated) {
      this.hydrated = true;
      return;
    }
    const scriptingNames = this.getZequencerScriptingNames();
    if (this.serializedPresets) {
      for (let i = 0; i < this.serializedPresets.length; i++) {
        if (!this.presets[i]) {
          this.presets[i] = {};
          this.presetNames[i] = "";
        }
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
    if (this.serializedStepParameterLocks) {
      for (const [stepId, serializedPreset] of Object.entries(this.serializedStepParameterLocks)) {
        for (const id in serializedPreset) {
          let { state } = serializedPreset[id];
          let node = allNodes.find((x) => x.id === id);
          if (node) {
            if (scriptingNames.includes(node.attributes["scripting name"] as string)) {
              continue;
            }
            if (!this.stepParameterLocks[stepId]) {
              this.stepParameterLocks[stepId] = {};
            }
            this.stepParameterLocks[stepId][id] = {
              node,
              state,
            };
          }
        }
      }
    }
    if (this.lastReceivedPatternCount !== undefined) {
      this.setPatternCount(this.lastReceivedPatternCount);
    }
    this.hydrated = true;
    this.initialHydrated = true;

    this.normalize();

    this.hydratedAt = new Date().getTime();
    if (this.objectNode.patch.vm && this.objectNode.attributes.patternMode) {
      // if we're in the VM switch to current pattern at end of hydration
      this.switchToPattern(this.currentPattern || 0);
    }
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

  getAllNodeIdsControlledByPresets() {
    const ids = new Set<string>();
    for (const preset of this.presets) {
      for (const id in preset) ids.add(id);
    }
    for (const slot of this.slots) {
      for (const pattern of slot) {
        for (const id in pattern) {
          ids.add(id);
        }
      }
    }
    return ids;
  }

  getAllStateChangesForNodeId(nodeId: string) {
    const stateChanges: StateChange[] = [];
    for (const preset of this.presets) {
      if (preset[nodeId]) stateChanges.push(preset[nodeId]);
    }
    for (const slot of this.slots) {
      for (const pattern of slot) {
        if (!pattern) continue;
        if (pattern[nodeId]) {
          stateChanges.push(pattern[nodeId]);
        }
      }
    }
    return stateChanges;
  }

  // normalizes the presets and slots such that they all have the same # of parameters that they control
  // this keeps preset state from getting out of wack where one preset controls more parameters than an other
  // and switching becomes not expected as certain parameters state drifts
  normalize() {
    const allNodeIds = [...this.getAllNodeIdsControlledByPresets()];
    for (const preset of this.presets) {
      if (Object.keys(preset).length === 0) {
        // skip empty presets
        continue;
      }
      for (const id of allNodeIds) {
        if (!preset[id]) {
          // missing from this preset
          const stateChanges = this.getAllStateChangesForNodeId(id);
          if (stateChanges[0]) {
            preset[id] = { ...stateChanges[0] };
          }
        }
      }
    }
    for (const slot of this.slots) {
      for (let i = 0; i < slot.length; i++) {
        if (!slot[i]) {
          slot[i] = {};
        }
        const pattern = slot[i];
        for (const id of allNodeIds) {
          if (!pattern[id]) {
            const stateChanges = this.getAllStateChangesForNodeId(id);
            if (stateChanges[0]) {
              pattern[id] = { ...stateChanges[0] };
            }
          }
        }
      }
    }
  }
}
