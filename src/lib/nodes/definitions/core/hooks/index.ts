import { getSlotNodes } from "./slots";
import { getNodesWithName, getCurrentSubPatch } from "./getNodesWithName";
import { onPatchSelect, onPatchUnselect } from "./onSelect";
import { setSideNodeWindow, setPatchWindows } from "./windows";
import { onSave } from "./onSave";
import { onPatchResize } from "./onPatchResize";

export const hooks = {
  onPatchResize,
  onSave,
  getSlotNodes,
  getNodesWithName,
  getCurrentSubPatch,
  onPatchSelect,
  onPatchUnselect,
  setPatchWindows,
  setSideNodeWindow,
};
