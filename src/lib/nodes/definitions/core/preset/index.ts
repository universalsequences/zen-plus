import { doc } from "../doc";
import { ObjectNode, Message, AttributeValue } from "../../../types";
import { PresetManager } from "./manager";

doc("preset", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "preset system",
});

export const preset = (object: ObjectNode) => {
  object.isResizable = true;
  if (!object.size) {
    object.size = { width: 200, height: 100 };
  }
  if (!object.attributes.showNames) {
    object.attributes.showNames = false;
  }
  if (!object.attributes.hidePatterns) {
    object.attributes.hidePatterns = false;
  }
  if (!object.attributes.slotMode) {
    object.attributes.slotMode = false;
  }
  if (!object.attributes.slots) {
    object.attributes.slots = 4;
  }
  if (!object.attributes.patternMode) {
    object.attributes.patternMode = false;
  }
  if (!object.attributes.zequencerObjects) {
    object.attributes.zequencerObjects = "";
  }
  if (!object.attributes.compactPatternMode) {
    object.attributes.compactPatternMode = false;
  }
  if (!object.attributes.cellSize) {
    object.attributes.cellSize = 20;
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
      mgmt.updateUI();
    }
  };
  return (x: Message) => {
    const mgmt = object.custom as PresetManager;
    if (x === "update-ui") {
      updateUI();
      return [];
    }
    if (mgmt) {
      if (typeof x === "number") {
        mgmt.switchToPreset(Math.round(x as number));
        updateUI();
        return [["switch-to-preset", x as number]];
      } else if (Array.isArray(x) && x[0] === "delete") {
        for (let i = 1; i < x.length; i++) {
          mgmt.deletePreset(x[i] as number);
        }
      } else if (Array.isArray(x) && x[0] === "set-name") {
        mgmt.setPresetName(x[1] as string);
        updateUI();
      } else if (x === "write-to-memory") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot);
      } else if (x === "save-as-new") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot, true);
        updateUI();
      } else if (x === "new-pattern") {
        mgmt.newPattern();
        return [["new-pattern", "bang"]];
      } else if (Array.isArray(x) && x[0] === "copy-to-slot") {
        const currentSlot = x[2] !== undefined ? (x[2] as number) : mgmt.currentPreset;
        const presetNumber = x[1] as number;
        console.log("copy to slot currentSlot=%s presetNumber=%s", currentSlot, presetNumber);
        mgmt.copyToSlot(presetNumber, currentSlot);
        updateUI();
        return [["copy-to-slot", x[1]]];
      } else if (Array.isArray(x) && x[0] === "switch-to-pattern") {
        const patternNumber = x[1] as number;
        mgmt.switchToPattern(patternNumber);
        return [["switch-to-pattern", x[1]]];
      } else if (x === "delete-pattern") {
        mgmt.deletePattern();
        return [["delete-pattern", "bang"]];
      } else if (typeof x === "object" && "voice" in x && "preset" in x && "time" in x) {
        const { voice, preset, time } = x;
        mgmt.switchToPreset(Math.round(preset as number), voice as number, time as number);
      }
    }
    return [];
  };
};

// Re-export for backwards compatibility
export { PresetManager } from "./manager";
export * from "./types";
export * from "./utils";