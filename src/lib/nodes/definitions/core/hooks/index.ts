import { getSlotNodes } from "./slots";
import { getNodesWithName } from "./getNodesWithName";
import { onPatchSelect } from "./onSelect";
import { setSideNodeWindow, setPatchWindows } from "./windows";
import { onSave } from "./onSave";
import { onPatchResize } from "./onPatchResize";

export const hooks = {
  onPatchResize,
  onSave,
  getSlotNodes,
  getNodesWithName,
  onPatchSelect,
  setPatchWindows,
  setSideNodeWindow,
};
