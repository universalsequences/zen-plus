import { doc } from "../doc";
import { ObjectNode, Message, AttributeValue } from "../../../types";
import { PresetManager } from "./manager";

doc("preset", {
  numberOfInlets: 1,
  numberOfOutlets: 3,
  description: "preset system",
  outletNames: ["operation", "current pattern", "number of patterns"],
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
  return (msg: Message) => {
    const mgmt = object.custom as PresetManager;
    if (msg === "update-ui") {
      updateUI();
      return [];
    }
    if (mgmt) {
      if (typeof msg === "number") {
        mgmt.switchToPreset(Math.round(msg as number));
        updateUI();
        return [
          ["switch-to-preset", msg as number],
          mgmt.currentPattern,
          mgmt.getNumberOfPatterns(),
        ];
      } else if (Array.isArray(msg) && msg[0] === "delete") {
        for (let i = 1; i < msg.length; i++) {
          mgmt.deletePreset(msg[i] as number);
        }
        return [["delete", "bang"], mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (Array.isArray(msg) && msg[0] === "set-name") {
        mgmt.setPresetName(msg[1] as string);
        updateUI();
        return [undefined, mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (msg === "write-to-memory") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot);
        return [undefined, mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (msg === "save-as-new") {
        const currentSlot = mgmt.currentPreset;
        mgmt.writeToMemory(currentSlot, true);
        updateUI();
        return [undefined, mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (msg === "new-pattern") {
        mgmt.newPattern();
        return [["new-pattern", "bang"], mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (Array.isArray(msg) && msg[0] === "copy-to-slot") {
        const currentSlot = msg[2] !== undefined ? (msg[2] as number) : mgmt.currentPreset;
        const presetNumber = msg[1] as number;
        mgmt.copyToSlot(presetNumber, currentSlot);
        updateUI();
        return [["copy-to-slot", msg[1]], mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (Array.isArray(msg) && msg[0] === "switch-to-pattern") {
        const patternNumber = msg[1] as number;
        mgmt.switchToPattern(patternNumber);
        return [["switch-to-pattern", msg[1]], mgmt.currentPattern, mgmt.getNumberOfPatterns()];
      } else if (Array.isArray(msg) && msg[0] === "set-pattern-count") {
        const patternCount = msg[1] as number;
        mgmt.setPatternCount(patternCount);
        return [
          ["set-pattern-count", patternCount],
          mgmt.currentPattern,
          mgmt.getNumberOfPatterns(),
        ];
      } else if (msg === "delete-pattern") {
        mgmt.deletePattern();
        return [["delete-pattern", "bang"], mgmt.getNumberOfPatterns()];
      } else if (Array.isArray(msg) && msg[0] === "move-pattern-to") {
        const sourcePattern = msg[1] as number;
        const targetPosition = msg[2] as number;
        mgmt.movePatternTo(sourcePattern, targetPosition);
        return [
          ["move-pattern-to", sourcePattern, targetPosition],
          mgmt.currentPattern,
          mgmt.getNumberOfPatterns(),
        ];
      } else if (typeof msg === "object" && "voice" in msg && "preset" in msg && "time" in msg) {
        const { voice, preset, time } = msg;
        mgmt.switchToPreset(Math.round(preset as number), voice as number, time as number);
      }
      return [undefined, mgmt.currentPattern, mgmt.getNumberOfPatterns()];
    }
    return [];
  };
};

// Re-export for backwards compatibility
export { PresetManager } from "./manager";
export * from "./types";
export * from "./utils";
