import { Preset, SerializedPreset } from "./types";

export const copyPreset = (preset: Preset) => {
  const copied: Preset = {};
  for (const id in preset) {
    const stateChange = preset[id];
    if (typeof stateChange === "object" && stateChange !== null) {
      copied[id] = {
        node: stateChange.node, // Keep same node reference
        state: JSON.parse(JSON.stringify(stateChange.state)) // Deep copy the state
      };
    } else {
      copied[id] = stateChange;
    }
  }
  return copied;
};

export const serializePreset = (preset: Preset) => {
  let _p: SerializedPreset = {};
  for (let id in preset) {
    _p[id] = { id, state: preset[id].state };
  }
  return _p;
};