import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  PresetManager,
  StateChange,
  Preset,
  SlotToPreset,
  copyPreset,
} from "@/lib/nodes/definitions/core/preset/index";
import { MockObjectNode } from "./mocks/MockObjectNode";
import { MockPatch } from "./mocks/MockPatch";
import { ObjectNode, Node, Message } from "@/lib/nodes/types";

// Mock the messaging queue
mock.module("@/lib/messaging/queue", () => ({
  subscribe: mock(() => {}),
}));

// Mock traverse
mock.module("@/lib/nodes/traverse", () => ({
  getRootPatch: mock(() => ({
    registerNodes: mock(() => {}),
  })),
}));

// Test helper to create a mock node with state
const createMockNodeWithState = (id: string, name: string, scriptingName = ""): ObjectNode => {
  const patch = new MockPatch();
  const node = new MockObjectNode(patch, id);
  node.name = name;
  node.attributes["scripting name"] = scriptingName;
  node.custom = {
    fromJSON: mock(() => {}),
    getJSON: mock(() => ({ state: "test" })),
  };
  return node;
};

// Test helper to create state change
const createStateChange = (node: Node, state: any): StateChange => ({
  node,
  state,
});

describe("PresetManager", () => {
  let presetManager: PresetManager;
  let mockObjectNode: ObjectNode;
  let mockPatch: MockPatch;

  beforeEach(() => {
    mockPatch = new MockPatch();
    mockObjectNode = new MockObjectNode(mockPatch);
    mockObjectNode.attributes = {
      slots: 4,
      slotMode: false,
      patternMode: false,
      zequencerObjects: "",
    };
    mockObjectNode.updateWorkerState = mock(() => {});
    mockObjectNode.onNewValue = mock(() => {});

    presetManager = new PresetManager(mockObjectNode);
  });

  describe("Basic Preset Operations", () => {
    it("should initialize with default values", () => {
      expect(presetManager.currentPreset).toBe(0);
      expect(presetManager.presets.length).toBe(64);
      expect(presetManager.presetNames.length).toBe(64);
      expect(presetManager.slotMode).toBe(false);
      expect(presetManager.currentPattern).toBe(0);
    });

    it("should switch to preset correctly", () => {
      const targetPreset = 5;
      presetManager.switchToPreset(targetPreset);
      expect(presetManager.currentPreset).toBe(targetPreset);
    });

    it("should set preset name correctly", () => {
      const presetName = "Bass Patch";
      presetManager.currentPreset = 3;
      presetManager.setPresetName(presetName);
      expect(presetManager.presetNames[3]).toBe(presetName);
    });

    it("should delete preset correctly", () => {
      const presetNumber = 2;
      presetManager.presets[presetNumber] = {
        node1: createStateChange(createMockNodeWithState("node1", "attrui"), 100),
      };
      presetManager.presetNames[presetNumber] = "Test Preset";

      presetManager.deletePreset(presetNumber);

      expect(Object.keys(presetManager.presets[presetNumber]).length).toBe(0);
      expect(presetManager.presetNames[presetNumber]).toBe("");
    });
  });

  describe("Slot Mode Operations", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;
    });

    it("should enable slot mode correctly", () => {
      expect(presetManager.slotMode).toBe(true);
      expect(presetManager.slots.length).toBe(4); // default slots
    });

    it("should set number of slots correctly", () => {
      const newSlotCount = 8;
      presetManager.setNumberOfSlots(newSlotCount);
      expect(presetManager.slots.length).toBe(newSlotCount);
    });

    it("should copy preset to slot correctly", () => {
      const presetNumber = 1;
      const slotNumber = 2;
      const node = createMockNodeWithState("test1", "attrui");
      const stateChange = createStateChange(node, 42);

      presetManager.presets[presetNumber]["test1"] = stateChange;
      presetManager.copyToSlot(presetNumber, slotNumber);

      expect(presetManager.currentPreset).toBe(slotNumber);
      expect(presetManager.slots[slotNumber][0]["test1"].state).toBe(42);
      expect(presetManager.slotToPreset[slotNumber][0]).toBe(presetNumber);
    });

    it("should write slot to memory correctly", () => {
      const slotNumber = 1;
      const node = createMockNodeWithState("test1", "attrui");
      const stateChange = createStateChange(node, 123);

      // Set up slot with state
      presetManager.slots[slotNumber] = [{ test1: stateChange }];
      presetManager.slotToPreset[slotNumber] = [5]; // maps to preset 5

      presetManager.writeToMemory(slotNumber);

      expect(presetManager.presets[5]["test1"].state).toBe(123);
    });
  });

  describe("Pattern Mode Operations", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;
      mockObjectNode.attributes.patternMode = true;
    });

    it("should create new pattern correctly", () => {
      // Set up initial state in pattern 0
      const node = createMockNodeWithState("test1", "attrui");
      const stateChange = createStateChange(node, 100);
      presetManager.slots[0][0] = { test1: stateChange };
      presetManager.slotToPreset[0] = [3]; // slot 0 maps to preset 3 in pattern 0

      const initialPatterns = presetManager.getNumberOfPatterns();
      presetManager.newPattern();

      expect(presetManager.getNumberOfPatterns()).toBe(initialPatterns + 1);
      expect(presetManager.currentPattern).toBe(initialPatterns);

      // Check that state was copied to new pattern
      const newPattern = presetManager.currentPattern;
      expect(presetManager.slots[0][newPattern]["test1"].state).toBe(100);
      expect(presetManager.slotToPreset[0][newPattern]).toBe(3);
    });

    it("should delete pattern correctly", () => {
      // Create multiple patterns
      presetManager.newPattern();
      presetManager.newPattern();

      const initialPatterns = presetManager.getNumberOfPatterns();
      const currentPattern = presetManager.currentPattern;

      presetManager.deletePattern();

      expect(presetManager.getNumberOfPatterns()).toBe(initialPatterns - 1);
      expect(presetManager.currentPattern).toBeLessThan(currentPattern);
    });

    it("should not delete the last pattern", () => {
      // Start with only one pattern
      expect(presetManager.getNumberOfPatterns()).toBe(1);

      presetManager.deletePattern();

      expect(presetManager.getNumberOfPatterns()).toBe(1);
    });

    it("should switch to pattern correctly", () => {
      // Create multiple patterns with different states
      const node1 = createMockNodeWithState("node1", "attrui");
      const node2 = createMockNodeWithState("node2", "attrui");

      // Pattern 0
      presetManager.slots[0][0] = { node1: createStateChange(node1, 100) };

      // Create pattern 1
      presetManager.newPattern();
      presetManager.slots[0][1] = { node1: createStateChange(node1, 200) };

      // Switch back to pattern 0
      presetManager.switchToPattern(0);

      expect(presetManager.currentPattern).toBe(0);
    });
  });

  describe("Bug Reproduction: Pattern Mode + Slot Mode Edge Cases", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;
      mockObjectNode.attributes.patternMode = true;
    });

    it("should handle new pattern creation and switching correctly", () => {
      // Setup initial state in pattern 0
      const synthNode = createMockNodeWithState("synth1", "attrui", "lead-synth");
      const filterNode = createMockNodeWithState("filter1", "attrui", "filter");

      // Set up initial state in slot 0, pattern 0
      presetManager.currentPreset = 0;
      presetManager.slots[0][0] = {
        synth1: createStateChange(synthNode, { frequency: 440, amp: 0.5 }),
        filter1: createStateChange(filterNode, { cutoff: 1000 }),
      };
      presetManager.slotToPreset[0] = [1]; // maps to preset 1

      // Create new pattern (should copy current state)
      presetManager.newPattern();
      const newPatternIndex = presetManager.currentPattern;

      // Verify new pattern was created and state was copied
      expect(newPatternIndex).toBe(1);
      expect(presetManager.slots[0][newPatternIndex]["synth1"].state.frequency).toBe(440);
      expect(presetManager.slots[0][newPatternIndex]["filter1"].state.cutoff).toBe(1000);
      expect(presetManager.slotToPreset[0][newPatternIndex]).toBe(1);

      // Modify state in new pattern
      presetManager.slots[0][newPatternIndex]["synth1"] = createStateChange(synthNode, {
        frequency: 880,
        amp: 0.8,
      });
      presetManager.slots[0][newPatternIndex]["filter1"] = createStateChange(filterNode, {
        cutoff: 2000,
      });

      // Switch to different pattern (pattern 0)
      presetManager.switchToPattern(0);
      expect(presetManager.currentPattern).toBe(0);

      // Switch back to new pattern
      presetManager.switchToPattern(newPatternIndex);
      expect(presetManager.currentPattern).toBe(newPatternIndex);

      // Verify state is preserved correctly
      expect(presetManager.slots[0][newPatternIndex]["synth1"].state.frequency).toBe(880);
      expect(presetManager.slots[0][newPatternIndex]["filter1"].state.cutoff).toBe(2000);
    });

    it("should maintain slot-to-preset mapping across pattern operations", () => {
      // Set up multiple slots with different preset mappings
      presetManager.setNumberOfSlots(3);

      // Slot 0 -> Preset 5, Slot 1 -> Preset 10, Slot 2 -> Preset 15
      presetManager.slotToPreset[0] = [5];
      presetManager.slotToPreset[1] = [10];
      presetManager.slotToPreset[2] = [15];

      // Create new pattern
      presetManager.newPattern();

      // Verify mappings were preserved
      expect(presetManager.slotToPreset[0][1]).toBe(5);
      expect(presetManager.slotToPreset[1][1]).toBe(10);
      expect(presetManager.slotToPreset[2][1]).toBe(15);

      // Delete pattern and verify mappings remain consistent
      presetManager.switchToPattern(0);
      presetManager.deletePattern();

      // Should still have pattern 0 mappings
      expect(presetManager.slotToPreset[0][0]).toBe(5);
      expect(presetManager.slotToPreset[1][0]).toBe(10);
      expect(presetManager.slotToPreset[2][0]).toBe(15);
    });

    it("should handle pattern switching with voice assignments", () => {
      const synthNode = createMockNodeWithState("synth1", "attrui");

      // Set up voice mappings
      presetManager.voiceToPreset.set(0, 0); // voice 0 -> slot 0
      presetManager.voiceToPreset.set(1, 1); // voice 1 -> slot 1

      // Create state in both slots
      presetManager.slots[0][0] = { synth1: createStateChange(synthNode, { voice: 0, freq: 440 }) };
      presetManager.slots[1][0] = { synth1: createStateChange(synthNode, { voice: 1, freq: 880 }) };

      // Create new pattern
      presetManager.newPattern();

      // Modify new pattern
      presetManager.slots[0][1]["synth1"] = createStateChange(synthNode, { voice: 0, freq: 660 });
      presetManager.slots[1][1]["synth1"] = createStateChange(synthNode, { voice: 1, freq: 1320 });

      // Switch patterns and verify voice assignments are handled
      presetManager.switchToPattern(0);
      presetManager.switchToPattern(1);

      expect(presetManager.slots[0][1]["synth1"].state.freq).toBe(660);
      expect(presetManager.slots[1][1]["synth1"].state.freq).toBe(1320);
    });
  });

  describe("Zequencer Integration", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;
      mockObjectNode.attributes.patternMode = true;
      mockObjectNode.attributes.zequencerObjects = "seq1,seq2,seq3";
    });

    it("should handle zequencer scripting names correctly", () => {
      const names = presetManager.getZequencerScriptingNames();
      expect(names).toEqual(["seq1", "seq2", "seq3"]);
    });

    it("should handle zequencer objects in pattern mode", () => {
      const zequencerNode = createMockNodeWithState("zseq1", "zequencer.core", "seq1");

      // Set up pattern-specific zequencer state
      presetManager.slots[0][0] = {
        zseq1: createStateChange(zequencerNode, { pattern: [1, 0, 1, 0] }),
      };

      presetManager.newPattern();
      presetManager.slots[0][1] = {
        zseq1: createStateChange(zequencerNode, { pattern: [0, 1, 0, 1] }),
      };

      // Switch patterns and verify zequencer state is handled correctly
      presetManager.switchToPattern(0);
      expect(presetManager.slots[0][0]["zseq1"].state.pattern).toEqual([1, 0, 1, 0]);

      presetManager.switchToPattern(1);
      expect(presetManager.slots[0][1]["zseq1"].state.pattern).toEqual([0, 1, 0, 1]);
    });
  });

  describe("State Management Edge Cases", () => {
    it("should handle empty presets correctly", () => {
      const emptyPreset = {};
      presetManager.applyPreset(emptyPreset);
      // Should not throw
    });

    it("should handle preset application with missing nodes", () => {
      const missingNodePreset: Preset = {
        "missing-node": createStateChange(createMockNodeWithState("missing", "attrui"), 100),
      };

      // Should not throw when applying preset with missing nodes
      presetManager.applyPreset(missingNodePreset);
    });

    it("should handle concurrent state changes", () => {
      const node = createMockNodeWithState("test1", "attrui");

      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const stateChange = createStateChange(node, i);
        presetManager.presets[0]["test1"] = stateChange;
      }

      expect(presetManager.presets[0]["test1"].state).toBe(9);
    });

    it("should handle voice-specific preset switching", () => {
      const synthNode = createMockNodeWithState("synth1", "attrui");
      presetManager.presets[5] = {
        synth1: createStateChange(synthNode, { amp: 0.8 }),
      };

      // Switch preset for specific voice
      presetManager.switchToPreset(5, 2, 1000); // preset 5, voice 2, time 1000

      expect(presetManager.voiceToPreset.get(2)).toBe(5);
      expect(presetManager.currentVoicePreset).toBe(5);
    });
  });

  describe("Serialization and Hydration", () => {
    it("should serialize and deserialize correctly", () => {
      const node = createMockNodeWithState("test1", "attrui");
      presetManager.presets[0]["test1"] = createStateChange(node, 100);
      presetManager.presetNames[0] = "Test Preset";

      const json = presetManager.getJSON();

      expect(json.currentPreset).toBe(0);
      expect(json.presetNames[0]).toBe("Test Preset");
      expect(json.presets[0]["test1"].state).toBe(100);
    });

    it("should handle JSON loading correctly", () => {
      const json = {
        currentPreset: 3,
        presetNames: ["", "", "", "Loaded Preset"],
        presets: [{}, {}, {}, { test1: { id: "test1", state: 200 } }],
        slots: [],
        slotToPreset: {},
        currentPattern: 0,
      };

      presetManager.fromJSON(json);

      expect(presetManager.currentPreset).toBe(3);
      expect(presetManager.presetNames[3]).toBe("Loaded Preset");
      expect(presetManager.serializedPresets?.[3]["test1"].state).toBe(200);
    });
  });

  describe("Utility Functions", () => {
    it("should copy presets correctly", () => {
      const node = createMockNodeWithState("test1", "attrui");
      const original: Preset = {
        test1: createStateChange(node, { value: 100, nested: { prop: 42 } }),
      };

      const copied = copyPreset(original);

      expect(copied["test1"].state.value).toBe(100);
      expect(copied["test1"].state.nested.prop).toBe(42);

      // Verify it's a deep copy
      copied["test1"].state.value = 200;
      expect(original["test1"].state.value).toBe(100);
    });
  });

  describe("Performance and Memory", () => {
    it("should handle large numbers of presets efficiently", () => {
      const start = performance.now();

      // Create many presets with state
      for (let i = 0; i < 64; i++) {
        const node = createMockNodeWithState(`node${i}`, "attrui");
        presetManager.presets[i][`node${i}`] = createStateChange(node, i * 10);
      }

      // Switch between presets rapidly
      for (let i = 0; i < 100; i++) {
        presetManager.switchToPreset(i % 64);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it("should handle large slot operations efficiently", () => {
      presetManager.slotMode = true;
      presetManager.setNumberOfSlots(16);

      const start = performance.now();

      // Create many patterns
      for (let p = 0; p < 10; p++) {
        presetManager.newPattern();
        for (let s = 0; s < 16; s++) {
          const node = createMockNodeWithState(`node${s}`, "attrui");
          presetManager.slots[s][p] = {
            [`node${s}`]: createStateChange(node, s * p),
          };
        }
      }

      // Switch between patterns rapidly
      for (let i = 0; i < 50; i++) {
        presetManager.switchToPattern(i % 10);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(200); // Should be reasonably fast
    });
  });
});
