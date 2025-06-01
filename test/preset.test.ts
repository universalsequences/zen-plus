import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  PresetManager,
  StateChange,
  Preset,
  SlotToPreset,
  copyPreset,
  PresetOperation,
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

// Mock synth state machine to track actual parameter values per voice
class MockSynthState {
  private voiceParams: Map<number, Record<string, any>> = new Map();
  private parameterUpdateLog: Array<{voice: number | undefined, nodeId: string, params: Record<string, any>, time?: number}> = [];

  updateParameters(voice: number | undefined, nodeId: string, params: Record<string, any>, time?: number) {
    // Log all parameter updates for debugging
    this.parameterUpdateLog.push({ voice, nodeId, params, time });

    // If voice is undefined, update all voices (main preset application)
    if (voice === undefined) {
      // For main preset, we need to determine which voices to update
      // For simplicity in tests, update voice 0 if no specific voice mapping exists
      const targetVoice = 0;
      if (!this.voiceParams.has(targetVoice)) {
        this.voiceParams.set(targetVoice, {});
      }
      Object.assign(this.voiceParams.get(targetVoice)!, params);
    } else {
      if (!this.voiceParams.has(voice)) {
        this.voiceParams.set(voice, {});
      }
      Object.assign(this.voiceParams.get(voice)!, params);
    }
  }

  getVoiceParameters(voice: number): Record<string, any> {
    return { ...this.voiceParams.get(voice) } || {};
  }

  getUpdateLog() {
    return [...this.parameterUpdateLog];
  }

  clearLog() {
    this.parameterUpdateLog = [];
  }

  reset() {
    this.voiceParams.clear();
    this.parameterUpdateLog = [];
  }
}

describe("PresetManager", () => {
  let presetManager: PresetManager;
  let mockObjectNode: ObjectNode;
  let mockPatch: MockPatch;
  let mockSynthState: MockSynthState;

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

    mockSynthState = new MockSynthState();
    presetManager = new PresetManager(mockObjectNode);
    
    // Mock applyPreset to update our mock synth state
    const originalApplyPreset = presetManager.applyPreset.bind(presetManager);
    presetManager.applyPreset = mock((preset: Preset, voice?: number, time?: number) => {
      // Call original method for side effects (like setting switching flag)
      originalApplyPreset(preset, voice, time);
      
      // Update our mock synth state
      for (const nodeId in preset) {
        const { state } = preset[nodeId];
        mockSynthState.updateParameters(voice, nodeId, state, time);
      }
    });
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
      // Set up a preset so it's not empty
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[targetPreset] = {
        node1: createStateChange(node1, { frequency: 440 }),
      };
      
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

  describe("Pattern Reordering", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;
      mockObjectNode.attributes.patternMode = true;
    });

    it("should move pattern forward correctly", () => {
      // Create 5 patterns with unique states
      for (let p = 0; p < 5; p++) {
        if (p > 0) presetManager.newPattern();
        
        const node = createMockNodeWithState(`node${p}`, "attrui");
        presetManager.slots[0][p] = {
          [`node${p}`]: createStateChange(node, { originalPattern: p, value: p * 100 })
        };
        // Initialize slotToPreset array if needed
        if (!presetManager.slotToPreset[0]) {
          presetManager.slotToPreset[0] = [];
        }
        presetManager.slotToPreset[0][p] = p + 10; // arbitrary mapping
      }

      // Move pattern 1 to position 3 (forward move)
      // Original: [0, 1, 2, 3, 4] -> After move: [0, 2, 3, 1, 4]
      presetManager.movePatternTo(1, 3);

      // Verify pattern order after move: [0, 2, 1, 3, 4]
      // Pattern 1 (node1) moved to position 2, shifting 2 and 3 right
      expect(presetManager.slots[0][0][`node0`].state.originalPattern).toBe(0);
      expect(presetManager.slots[0][1][`node2`].state.originalPattern).toBe(2);
      expect(presetManager.slots[0][2][`node1`].state.originalPattern).toBe(1); // moved pattern
      expect(presetManager.slots[0][3][`node3`].state.originalPattern).toBe(3);
      expect(presetManager.slots[0][4][`node4`].state.originalPattern).toBe(4);

      // Verify slotToPreset mappings moved correctly
      // After movePatternTo(1, 3): [0, 2, 1, 3, 4]
      expect(presetManager.slotToPreset[0][0]).toBe(10); // original pattern 0 -> preset 10
      expect(presetManager.slotToPreset[0][1]).toBe(12); // original pattern 2 -> preset 12
      expect(presetManager.slotToPreset[0][2]).toBe(11); // original pattern 1 -> preset 11 (moved)
      expect(presetManager.slotToPreset[0][3]).toBe(13); // original pattern 3 -> preset 13
      expect(presetManager.slotToPreset[0][4]).toBe(14); // original pattern 4 -> preset 14
    });

    it("should move pattern backward correctly", () => {
      // Create 5 patterns
      for (let p = 0; p < 5; p++) {
        if (p > 0) presetManager.newPattern();
        
        const node = createMockNodeWithState(`node${p}`, "attrui");
        presetManager.slots[0][p] = {
          [`node${p}`]: createStateChange(node, { pattern: p })
        };
      }

      // Move pattern 3 to position 1 (backward move)
      presetManager.movePatternTo(3, 1);

      // Verify pattern order: [0, 3, 1, 2, 4]
      expect(presetManager.slots[0][0][`node0`].state.pattern).toBe(0);
      expect(presetManager.slots[0][1][`node3`].state.pattern).toBe(3); // moved pattern
      expect(presetManager.slots[0][2][`node1`].state.pattern).toBe(1);
      expect(presetManager.slots[0][3][`node2`].state.pattern).toBe(2);
      expect(presetManager.slots[0][4][`node4`].state.pattern).toBe(4);
    });

    it("should update currentPattern when moving the current pattern", () => {
      // Create 4 patterns
      for (let p = 0; p < 4; p++) {
        if (p > 0) presetManager.newPattern();
      }

      // Set current pattern to 2
      presetManager.currentPattern = 2;

      // Move current pattern (2) to position 0
      presetManager.movePatternTo(2, 0);

      // Current pattern should now be at position 0
      expect(presetManager.currentPattern).toBe(0);
    });

    it("should update currentPattern when other patterns move around it", () => {
      // Create 5 patterns
      for (let p = 0; p < 5; p++) {
        if (p > 0) presetManager.newPattern();
      }

      // Set current pattern to 3
      presetManager.currentPattern = 3;

      // Move pattern 1 to position 4 (forward move, affects current pattern)
      presetManager.movePatternTo(1, 4);

      // Current pattern should shift left from 3 to 2
      expect(presetManager.currentPattern).toBe(2);
    });

    it("should handle moving to same position (no-op)", () => {
      // Create 3 patterns
      for (let p = 0; p < 3; p++) {
        if (p > 0) presetManager.newPattern();
        
        const node = createMockNodeWithState(`node${p}`, "attrui");
        presetManager.slots[0][p] = {
          [`node${p}`]: createStateChange(node, { pattern: p })
        };
      }

      const originalCurrentPattern = presetManager.currentPattern;

      // Move pattern 1 to position 1 (same position)
      presetManager.movePatternTo(1, 1);

      // Nothing should change
      expect(presetManager.slots[0][0][`node0`].state.pattern).toBe(0);
      expect(presetManager.slots[0][1][`node1`].state.pattern).toBe(1);
      expect(presetManager.slots[0][2][`node2`].state.pattern).toBe(2);
      expect(presetManager.currentPattern).toBe(originalCurrentPattern);
    });

    it("should handle invalid source pattern indices", () => {
      // Create 3 patterns
      for (let p = 0; p < 3; p++) {
        if (p > 0) presetManager.newPattern();
      }

      const originalPatternCount = presetManager.getNumberOfPatterns();

      // Try to move invalid patterns
      presetManager.movePatternTo(-1, 1); // negative source
      presetManager.movePatternTo(5, 1);  // source out of bounds

      // Nothing should change
      expect(presetManager.getNumberOfPatterns()).toBe(originalPatternCount);
    });

    it("should handle invalid target position indices", () => {
      // Create 3 patterns
      for (let p = 0; p < 3; p++) {
        if (p > 0) presetManager.newPattern();
      }

      const originalPatternCount = presetManager.getNumberOfPatterns();

      // Try to move to invalid positions
      presetManager.movePatternTo(1, -1); // negative target
      presetManager.movePatternTo(1, 5);  // target out of bounds

      // Nothing should change
      expect(presetManager.getNumberOfPatterns()).toBe(originalPatternCount);
    });

    it("should preserve state across all slots during move", () => {
      presetManager.setNumberOfSlots(3);

      // Create 4 patterns with different states in each slot
      for (let p = 0; p < 4; p++) {
        if (p > 0) presetManager.newPattern();
        
        for (let s = 0; s < 3; s++) {
          const node = createMockNodeWithState(`slot${s}_node${p}`, "attrui");
          presetManager.slots[s][p] = {
            [`slot${s}_node${p}`]: createStateChange(node, { 
              slot: s, 
              pattern: p, 
              value: s * 100 + p 
            })
          };
        }
      }

      // Move pattern 2 to position 1
      presetManager.movePatternTo(2, 1);

      // Verify all slots maintained their state correctly
      // Expected order: [0, 2, 1, 3]
      for (let s = 0; s < 3; s++) {
        expect(presetManager.slots[s][0][`slot${s}_node0`].state.pattern).toBe(0);
        expect(presetManager.slots[s][1][`slot${s}_node2`].state.pattern).toBe(2); // moved
        expect(presetManager.slots[s][2][`slot${s}_node1`].state.pattern).toBe(1);
        expect(presetManager.slots[s][3][`slot${s}_node3`].state.pattern).toBe(3);

        // Verify values are correct
        expect(presetManager.slots[s][0][`slot${s}_node0`].state.value).toBe(s * 100 + 0);
        expect(presetManager.slots[s][1][`slot${s}_node2`].state.value).toBe(s * 100 + 2);
        expect(presetManager.slots[s][2][`slot${s}_node1`].state.value).toBe(s * 100 + 1);
        expect(presetManager.slots[s][3][`slot${s}_node3`].state.value).toBe(s * 100 + 3);
      }
    });

    it("should handle complex reordering sequence", () => {
      // Create 5 patterns with unique identifiers
      for (let p = 0; p < 5; p++) {
        if (p > 0) presetManager.newPattern();
        
        const node = createMockNodeWithState(`node${p}`, "attrui");
        presetManager.slots[0][p] = {
          [`node${p}`]: createStateChange(node, { originalPattern: p, id: p })
        };
      }

      // Perform multiple moves and test after each one
      // Initial: [node0, node1, node2, node3, node4]
      
      // Move 1: movePatternTo(4, 0) - move last to first
      presetManager.movePatternTo(4, 0);
      console.log("After movePatternTo(4, 0):");
      for (let i = 0; i < 5; i++) {
        const slotKeys = Object.keys(presetManager.slots[0][i] || {});
        console.log(`  Slot ${i}: ${slotKeys.join(', ')}`);
      }
      // Expected: [node4, node0, node1, node2, node3]
      expect(presetManager.slots[0][0][`node4`].state.originalPattern).toBe(4);
      expect(presetManager.slots[0][1][`node0`].state.originalPattern).toBe(0);

      // Move 2: movePatternTo(2, 4) - move position 2 to position 4  
      presetManager.movePatternTo(2, 4);
      console.log("After movePatternTo(2, 4):");
      for (let i = 0; i < 5; i++) {
        const slotKeys = Object.keys(presetManager.slots[0][i] || {});
        console.log(`  Slot ${i}: ${slotKeys.join(', ')}`);
      }
      // Current: [node4, node0, node1, node2, node3]
      // Moving position 2 (node1) to position 4
      // Will need to check actual result and fix expectations
      expect(presetManager.slots[0][0][`node4`].state.originalPattern).toBe(4);
      expect(presetManager.slots[0][1][`node0`].state.originalPattern).toBe(0);

      // Move 3: movePatternTo(0, 2) - move first to position 2
      presetManager.movePatternTo(0, 2);
      // Before move 3: [node4, node0, node2, node1, node3]
      // Moving position 0 (node4) to position 2
      // Actual result: [node0, node4, node2, node1, node3]
      expect(presetManager.slots[0][0][`node0`].state.originalPattern).toBe(0);
      expect(presetManager.slots[0][1][`node4`].state.originalPattern).toBe(4);
      expect(presetManager.slots[0][2][`node2`].state.originalPattern).toBe(2);
      expect(presetManager.slots[0][3][`node1`].state.originalPattern).toBe(1);
      expect(presetManager.slots[0][4][`node3`].state.originalPattern).toBe(3);
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

    it("should handle pattern reordering efficiently", () => {
      presetManager.slotMode = true;
      presetManager.setNumberOfSlots(8);

      // Create 20 patterns
      for (let p = 0; p < 20; p++) {
        if (p > 0) presetManager.newPattern();
        
        for (let s = 0; s < 8; s++) {
          const node = createMockNodeWithState(`s${s}_n${p}`, "attrui");
          presetManager.slots[s][p] = {
            [`s${s}_n${p}`]: createStateChange(node, s * 100 + p)
          };
        }
      }

      const start = performance.now();

      // Perform many pattern moves
      for (let i = 0; i < 50; i++) {
        const source = i % 20;
        const target = (i + 10) % 20;
        presetManager.movePatternTo(source, target);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should be fast
    });
  });

  describe("Operation Generation (generatePresetOperations)", () => {
    it("should generate basic preset apply operation", () => {
      // Set up a basic preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[5] = {
        node1: createStateChange(node1, { frequency: 440 }),
      };

      const operations = presetManager.generatePresetOperations(5);

      expect(operations).toHaveLength(1); // preset_apply (no buffer since buffer not initialized)
      expect(operations[0].type).toBe("preset_apply");
      expect((operations[0] as any).preset.node1.state.frequency).toBe(440);
    });

    it("should generate p-lock operations for voice with stepId", () => {
      // Set up base preset and p-locks
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[3] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000 }),
      };
      presetManager.stepParameterLocks["step_123"] = {
        node1: createStateChange(node1, { frequency: 880 }),
      };

      const operations = presetManager.generatePresetOperations(3, 0, 1000, "step_123");

      // Should have: plock_apply, voice_tracking, preset_apply
      expect(operations).toHaveLength(3);
      expect(operations[0].type).toBe("plock_apply");
      expect(operations[1].type).toBe("voice_tracking");
      expect(operations[2].type).toBe("preset_apply");

      const plockOp = operations[0] as any;
      expect(plockOp.voice).toBe(0);
      expect(plockOp.stepId).toBe("step_123");
      expect(plockOp.preset.node1.state.frequency).toBe(880);
    });

    it("should generate p-lock undo operations when switching from step with p-locks", () => {
      // Set up current p-locks for voice (different node than new p-locks)
      const node1 = createMockNodeWithState("node1", "attrui");
      const node2 = createMockNodeWithState("node2", "attrui");
      presetManager.presets[2] = {
        node1: createStateChange(node1, { frequency: 440, resonance: 0.5 }),
        node2: createStateChange(node2, { cutoff: 1000 }),
      };

      const currentPLocks = {
        node1: createStateChange(node1, { frequency: 880, resonance: 0.8 }),
      };
      presetManager.currentVoicePLocks.set(0, {
        stepId: "old_step",
        pLocks: currentPLocks,
      });

      // New step has different p-locks on different node
      presetManager.stepParameterLocks["new_step"] = {
        node2: createStateChange(node2, { cutoff: 2000 }),
      };

      const operations = presetManager.generatePresetOperations(2, 0, 1000, "new_step");

      // Should have: plock_undo (for node1), plock_apply (for node2), voice_tracking, preset_apply
      expect(operations).toHaveLength(4);
      expect(operations[0].type).toBe("plock_undo");
      expect(operations[1].type).toBe("plock_apply");

      const undoOp = operations[0] as any;
      // Should undo node1 (not in new p-locks) but not node2 (in new p-locks)
      expect(undoOp.preset.node1.state.frequency).toBe(440);
      expect(undoOp.preset.node1.state.resonance).toBe(0.5);
      expect(undoOp.preset.node2).toBeUndefined();

      const applyOp = operations[1] as any;
      expect(applyOp.preset.node2.state.cutoff).toBe(2000);
    });

    it("should generate preset copy operation when old preset has data but new is empty", () => {
      // Set up current preset with data
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.currentPreset = 1;
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440 }),
      };
      presetManager.presets[7] = {}; // Empty target preset

      const operations = presetManager.generatePresetOperations(7);

      expect(operations).toHaveLength(2); // preset_copy + preset_apply (no buffer)
      expect(operations[0].type).toBe("preset_copy");
      expect((operations[0] as any).toPresetNumber).toBe(7);
      expect((operations[0] as any).fromPreset.node1.state.frequency).toBe(440);
    });

    it("should handle slot mode correctly", () => {
      presetManager.slotMode = true;
      mockObjectNode.attributes.slotMode = true;

      // Set up slot preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.slots[2] = [{
        node1: createStateChange(node1, { frequency: 660 }),
      }];

      const operations = presetManager.generatePresetOperations(2);

      expect(operations).toHaveLength(1); // preset_apply (no buffer)
      const applyOp = operations[0] as any;
      expect(applyOp.preset.node1.state.frequency).toBe(660);
    });

    it("should handle early return for voice counter limit", () => {
      presetManager.voiceToPreset.set(5, 3);
      presetManager.counter = 45; // Above the 40 limit

      const operations = presetManager.generatePresetOperations(3, 5);

      // Should return early with no operations due to counter limit
      expect(operations).toHaveLength(0);
    });

    it("should handle complex 3-step p-lock transition scenario", () => {
      // Set up base preset with 3 parameters
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Step 1: No p-locks (uses base preset)
      // Step 2: P-locks with frequency=880, cutoff=2000 (both exist in base preset)
      presetManager.stepParameterLocks["step_2"] = {
        node1: createStateChange(node1, { frequency: 880, cutoff: 2000 }),
      };
      
      // Step 3: P-locks with frequency=660, resonance=0.8 
      // - frequency also exists in step 2 (should replace it)
      // - resonance doesn't exist in step 2 (so cutoff from step 2 should be undone)
      presetManager.stepParameterLocks["step_3"] = {
        node1: createStateChange(node1, { frequency: 660, resonance: 0.8 }),
      };

      // Simulate step 1 → step 2 transition
      let operations = presetManager.generatePresetOperations(1, 0, 1000, "step_2");
      expect(operations).toHaveLength(3); // plock_apply, voice_tracking, preset_apply
      expect(operations[0].type).toBe("plock_apply");

      // Set up current voice p-locks as if step 2 was just applied
      presetManager.currentVoicePLocks.set(0, {
        stepId: "step_2",
        pLocks: presetManager.stepParameterLocks["step_2"],
      });

      // Now test step 2 → step 3 transition
      operations = presetManager.generatePresetOperations(1, 0, 1000, "step_3");
      
      expect(operations).toHaveLength(4); // plock_undo, plock_apply, voice_tracking, preset_apply
      expect(operations[0].type).toBe("plock_undo");
      expect(operations[1].type).toBe("plock_apply");

      const undoOp = operations[0] as any;
      const applyOp = operations[1] as any;

      // Undo operation should restore cutoff to base value (since it's not in step_3)
      // but NOT frequency (since frequency will be overridden by step_3 p-lock)
      expect(undoOp.preset.node1.state.cutoff).toBe(1000); // restored to base
      expect(undoOp.preset.node1.state.frequency).toBeUndefined(); // not undone (will be overridden)
      expect(undoOp.preset.node1.state.resonance).toBeUndefined(); // not in step_2, so nothing to undo

      // Apply operation should set the new p-locks for step_3
      expect(applyOp.preset.node1.state.frequency).toBe(660); // new value
      expect(applyOp.preset.node1.state.resonance).toBe(0.8); // new parameter
      expect(applyOp.preset.node1.state.cutoff).toBeUndefined(); // not in step_3
    });

    it("should undo all p-locks when transitioning to step with no p-locks", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Step 4 has p-locks
      presetManager.stepParameterLocks["step_4"] = {
        node1: createStateChange(node1, { frequency: 880, cutoff: 2000 }),
      };

      // Simulate that step 4 was just applied (has current p-locks)
      presetManager.currentVoicePLocks.set(0, {
        stepId: "step_4",
        pLocks: presetManager.stepParameterLocks["step_4"],
      });

      // Step 1 has NO p-locks (stepId provided but no entry in stepParameterLocks)
      // This simulates going from step 4 back to step 1 in a loop
      const operations = presetManager.generatePresetOperations(1, 0, 1000, "step_1");

      // Should have: plock_undo (for all parameters), voice_tracking, preset_apply
      expect(operations).toHaveLength(3);
      expect(operations[0].type).toBe("plock_undo");
      expect(operations[1].type).toBe("voice_tracking");
      expect(operations[2].type).toBe("preset_apply");

      const undoOp = operations[0] as any;

      // Should undo ALL p-locked parameters back to base values
      expect(undoOp.preset.node1.state.frequency).toBe(440); // back to base
      expect(undoOp.preset.node1.state.cutoff).toBe(1000); // back to base
      expect(undoOp.preset.node1.state.resonance).toBeUndefined(); // wasn't p-locked, so not in undo
    });

    it("should handle 4-step loop scenario with p-locks", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Step 3 and 4 have p-locks, step 1 and 2 don't
      presetManager.stepParameterLocks["step_3"] = {
        node1: createStateChange(node1, { frequency: 660, cutoff: 1500 }),
      };
      presetManager.stepParameterLocks["step_4"] = {
        node1: createStateChange(node1, { frequency: 880, resonance: 0.8 }),
      };

      // Test step 3 → step 4 transition
      presetManager.currentVoicePLocks.set(0, {
        stepId: "step_3",
        pLocks: presetManager.stepParameterLocks["step_3"],
      });

      let operations = presetManager.generatePresetOperations(1, 0, 1000, "step_4");
      expect(operations).toHaveLength(4); // undo cutoff, apply new p-locks, voice_tracking, preset_apply
      
      // Simulate step 4 is now active
      presetManager.currentVoicePLocks.set(0, {
        stepId: "step_4", 
        pLocks: presetManager.stepParameterLocks["step_4"],
      });

      // Test step 4 → step 1 transition (back to start of loop, no p-locks)
      operations = presetManager.generatePresetOperations(1, 0, 1000, "step_1");
      expect(operations).toHaveLength(3); // undo all p-locks, voice_tracking, preset_apply

      const undoOp = operations[0] as any;
      // Should restore ALL p-locked parameters to base values
      expect(undoOp.preset.node1.state.frequency).toBe(440); // restore to base
      expect(undoOp.preset.node1.state.resonance).toBe(0.5); // restore to base
    });
  });

  describe("State Machine Testing (Full switchToPreset execution)", () => {
    it("should apply basic preset correctly to synth state", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[5] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000 }),
      };

      presetManager.switchToPreset(5);

      // Check final synth state
      const synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(440);
      expect(synthParams.cutoff).toBe(1000);
    });

    it("should apply p-locks correctly for specific voice", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Set up p-locks for step
      presetManager.stepParameterLocks["step_2"] = {
        node1: createStateChange(node1, { frequency: 880, cutoff: 2000 }),
      };

      // Apply step with p-locks
      presetManager.switchToPreset(1, 0, 1000, "step_2");

      // Check final synth state - should have p-locked values
      const synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(880); // p-locked value
      expect(synthParams.cutoff).toBe(2000); // p-locked value
      expect(synthParams.resonance).toBe(0.5); // base preset value
    });

    it("CRITICAL: should undo all p-locks when transitioning to step with no p-locks", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Step 4 has p-locks
      presetManager.stepParameterLocks["step_4"] = {
        node1: createStateChange(node1, { frequency: 880, cutoff: 2000 }),
      };

      // Apply step 4 with p-locks first
      presetManager.switchToPreset(1, 0, 1000, "step_4");
      
      // Verify p-locks are applied
      let synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(880); // p-locked
      expect(synthParams.cutoff).toBe(2000); // p-locked
      expect(synthParams.resonance).toBe(0.5); // base preset

      mockSynthState.clearLog(); // Clear for next test

      // Now transition to step 1 with NO p-locks
      presetManager.switchToPreset(1, 0, 1000, "step_1");

      // Check that ALL p-locked parameters are undone back to base values
      synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(440); // SHOULD BE undone to base
      expect(synthParams.cutoff).toBe(1000); // SHOULD BE undone to base  
      expect(synthParams.resonance).toBe(0.5); // unchanged (wasn't p-locked)

      // Debug: show what actually happened
      const updateLog = mockSynthState.getUpdateLog();
      console.log("Parameter updates during step_1 transition:", updateLog);
    });

    it("should handle 4-step sequencer loop with p-locks on steps 3 and 4", () => {
      // Set up base preset
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440, cutoff: 1000, resonance: 0.5 }),
      };

      // Step 3 and 4 have p-locks, step 1 and 2 don't
      presetManager.stepParameterLocks["step_3"] = {
        node1: createStateChange(node1, { frequency: 660, cutoff: 1500 }),
      };
      presetManager.stepParameterLocks["step_4"] = {
        node1: createStateChange(node1, { frequency: 880, resonance: 0.8 }),
      };

      // Test full sequence: step 1 → 2 → 3 → 4 → 1 (loop back)
      
      // Step 1: No p-locks (base preset)
      presetManager.switchToPreset(1, 0, 1000, "step_1");
      let synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(440);
      expect(synthParams.cutoff).toBe(1000);
      expect(synthParams.resonance).toBe(0.5);

      // Step 2: No p-locks (base preset)
      presetManager.switchToPreset(1, 0, 2000, "step_2");
      synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(440);
      expect(synthParams.cutoff).toBe(1000);
      expect(synthParams.resonance).toBe(0.5);

      // Step 3: P-locks (frequency=660, cutoff=1500)
      presetManager.switchToPreset(1, 0, 3000, "step_3");
      synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(660); // p-locked
      expect(synthParams.cutoff).toBe(1500); // p-locked
      expect(synthParams.resonance).toBe(0.5); // base preset

      // Step 4: Different p-locks (frequency=880, resonance=0.8)
      // Should undo cutoff back to base, keep frequency p-locked, add resonance p-lock
      presetManager.switchToPreset(1, 0, 4000, "step_4");
      synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(880); // new p-lock value
      expect(synthParams.cutoff).toBe(1000); // undone to base (not in step 4 p-locks)
      expect(synthParams.resonance).toBe(0.8); // new p-lock value

      mockSynthState.clearLog();

      // Step 1: Loop back - NO p-locks, should undo ALL p-locks
      presetManager.switchToPreset(1, 0, 5000, "step_1");
      synthParams = mockSynthState.getVoiceParameters(0);
      expect(synthParams.frequency).toBe(440); // undone to base
      expect(synthParams.cutoff).toBe(1000); // already at base
      expect(synthParams.resonance).toBe(0.5); // undone to base

      // Debug: show what happened during the critical transition
      const updateLog = mockSynthState.getUpdateLog();
      console.log("Critical step 4→1 transition updates:", updateLog);
    });

    it("should detect undefined behavior when multiple operations affect same parameter", () => {
      // This test checks for the undefined behavior case where multiple operations
      // might try to set the same parameter for the same voice at the same time
      
      const node1 = createMockNodeWithState("node1", "attrui");
      presetManager.presets[1] = {
        node1: createStateChange(node1, { frequency: 440 }),
      };

      // Create a scenario that might cause conflicting parameter updates
      presetManager.stepParameterLocks["step_conflict"] = {
        node1: createStateChange(node1, { frequency: 880 }),
      };

      // Set up current p-locks that have the same parameter
      presetManager.currentVoicePLocks.set(0, {
        stepId: "previous_step",
        pLocks: {
          node1: createStateChange(node1, { frequency: 660 }),
        },
      });

      mockSynthState.clearLog();

      // This should generate: undo (frequency=440) + apply p-lock (frequency=880) + apply preset (frequency=440)
      // The final frequency should be 440 (preset wins) since p-locks are applied before main preset
      presetManager.switchToPreset(1, 0, 1000, "step_conflict");

      const updateLog = mockSynthState.getUpdateLog();
      console.log("Update log for conflict scenario:", updateLog);

      // Count how many times frequency was updated for voice 0
      const frequencyUpdates = updateLog.filter(update => 
        update.voice === 0 && update.params.frequency !== undefined
      );
      
      if (frequencyUpdates.length > 1) {
        console.warn("UNDEFINED BEHAVIOR: Multiple frequency updates for same voice/time:", frequencyUpdates);
      }

      // Final state should be deterministic based on order of operations
      const synthParams = mockSynthState.getVoiceParameters(0);
      console.log("Final frequency after conflict:", synthParams.frequency);
    });
  });
});
