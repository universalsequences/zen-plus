import { Preset, SerializedPreset } from "./types";

export const copyPreset = (preset: Preset) => {
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

export const serializePreset = (preset: Preset) => {
  let _p: SerializedPreset = {};
  for (let id in preset) {
    _p[id] = { id, state: preset[id].state };
  }
  return _p;
};