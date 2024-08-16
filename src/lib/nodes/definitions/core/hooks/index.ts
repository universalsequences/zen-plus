import { getSlotNodes } from "./slots";
import { getNodesWithName } from "./getNodesWithName";
import { onPatchSelect } from "./onSelect";
import { setSideNodeWindow, setPatchWindows } from "./windows";

export const hooks = {
  getSlotNodes,
  getNodesWithName,
  onPatchSelect,
  setPatchWindows,
  setSideNodeWindow
};
