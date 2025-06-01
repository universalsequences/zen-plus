import { Node, Message } from "../../../types";

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

export type StaticMappedSlotNodes = {
  [id: string]: {
    state: StateChange;
    slot: number;
  };
};

export interface PLockUndoOperation {
  type: 'plock_undo';
  voice: number;
  preset: Preset;
  time?: number;
}

export interface PLockApplyOperation {
  type: 'plock_apply';
  voice: number;
  preset: Preset;
  stepId: string;
  time?: number;
}

export interface VoiceTrackingOperation {
  type: 'voice_tracking';
  voice: number;
  presetNumber: number;
  updateBuffer?: boolean;
}

export interface PresetCopyOperation {
  type: 'preset_copy';
  fromPreset: Preset;
  toPresetNumber: number;
}

export interface PresetApplyOperation {
  type: 'preset_apply';
  preset: Preset;
  voice?: number;
  time?: number;
}

export interface BufferUpdateOperation {
  type: 'buffer_update';
  oldPresetNumber: number;
  newPresetNumber: number;
}

export type PresetOperation = 
  | PLockUndoOperation 
  | PLockApplyOperation 
  | VoiceTrackingOperation 
  | PresetCopyOperation 
  | PresetApplyOperation
  | BufferUpdateOperation;
