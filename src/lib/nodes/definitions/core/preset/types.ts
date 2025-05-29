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
