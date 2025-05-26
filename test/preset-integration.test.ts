import { describe, it, expect, beforeEach, mock } from "bun:test";
import { PresetManager, preset, StateChange } from "@/lib/nodes/definitions/core/preset/index";
import { MockObjectNode } from "./mocks/MockObjectNode";
import { MockPatch } from "./mocks/MockPatch";
import { ObjectNode, Message } from "@/lib/nodes/types";

// Mock dependencies
mock.module("@/lib/messaging/queue", () => ({
  subscribe: mock((event, callback) => {
    // Store callback for manual triggering in tests
    (global as any).mockStateChangeCallback = callback;
  }),
}));

mock.module("@/lib/nodes/traverse", () => ({
  getRootPatch: mock(() => ({
    registerNodes: mock(() => {}),
    scriptingNameToNodes: {},
  })),
}));

describe("Preset Integration Tests", () => {
  let presetObject: ObjectNode;
  let presetManager: PresetManager;
  let mockPatch: MockPatch;
  let presetFunction: (x: Message) => Message[];

  beforeEach(() => {
    mockPatch = new MockPatch();
    presetObject = new MockObjectNode(mockPatch);
    presetObject.updateWorkerState = mock(() => {});
    presetObject.onNewValue = mock(() => {});

    // Initialize preset object
    presetFunction = preset(presetObject);
    presetManager = presetObject.custom as PresetManager;
  });

  describe("User Bug Report: Pattern + Slot Mode Issues", () => {
    beforeEach(() => {
      // Enable pattern + slot mode as reported in bug
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetObject.attributes.slots = 4;
      presetManager.slotMode = true;
    });

    it("should reproduce the reported bug scenario", () => {
      // Step 1: Set up initial state in pattern 0
      const synthNode = new MockObjectNode(mockPatch, "synth1");
      synthNode.name = "attrui";
      synthNode.attributes["scripting name"] = "lead-synth";
      synthNode.custom = {
        fromJSON: mock(),
        getJSON: mock(() => ({ cutoff: 1000, resonance: 0.5 })),
      };

      const filterNode = new MockObjectNode(mockPatch, "filter1");
      filterNode.name = "attrui";
      filterNode.attributes["scripting name"] = "main-filter";
      filterNode.custom = {
        fromJSON: mock(),
        getJSON: mock(() => ({ frequency: 440, amplitude: 0.7 })),
      };

      // Simulate state changes in pattern 0
      presetManager.currentPreset = 0;
      presetManager.slots[0][0] = {
        synth1: { node: synthNode, state: { cutoff: 1000, resonance: 0.5 } },
        filter1: { node: filterNode, state: { frequency: 440, amplitude: 0.7 } },
      };
      presetManager.slotToPreset[0] = [1]; // maps to preset 1

      // Step 2: Create new pattern (this is where the bug might occur)
      const newPatternResult = presetFunction("new-pattern");
      expect(newPatternResult).toEqual([["new-pattern", "bang"]]);

      const newPatternIndex = presetManager.currentPattern;
      expect(newPatternIndex).toBe(1);

      // Verify state was copied correctly to new pattern
      expect(presetManager.slots[0][newPatternIndex]["synth1"].state.cutoff).toBe(1000);
      expect(presetManager.slots[0][newPatternIndex]["filter1"].state.frequency).toBe(440);

      // Step 3: Modify state in new pattern
      presetManager.slots[0][newPatternIndex]["synth1"].state = { cutoff: 2000, resonance: 0.8 };
      presetManager.slots[0][newPatternIndex]["filter1"].state = { frequency: 880, amplitude: 0.9 };

      // Step 4: Switch to different pattern (pattern 0)
      const switchResult1 = presetFunction(["switch-to-pattern", 0]);
      expect(switchResult1).toEqual([["switch-to-pattern", 0]]);
      expect(presetManager.currentPattern).toBe(0);

      // Step 5: Return to new pattern (pattern 1) - this is where the bug occurs
      const switchResult2 = presetFunction(["switch-to-pattern", 1]);
      expect(switchResult2).toEqual([["switch-to-pattern", 1]]);
      expect(presetManager.currentPattern).toBe(1);

      // Step 6: Verify state is preserved correctly (this should catch the bug)
      const newPatternState = presetManager.slots[0][1];
      expect(newPatternState["synth1"].state.cutoff).toBe(2000);
      expect(newPatternState["synth1"].state.resonance).toBe(0.8);
      expect(newPatternState["filter1"].state.frequency).toBe(880);
      expect(newPatternState["filter1"].state.amplitude).toBe(0.9);

      // Verify slot-to-preset mapping is correct
      expect(presetManager.slotToPreset[0][1]).toBe(1);
    });

    it("should handle rapid pattern switching without state corruption", () => {
      // Create multiple patterns with distinct states
      const patterns = 5;
      const nodes = Array.from({ length: 3 }, (_, i) => {
        const node = new MockObjectNode(mockPatch, `node${i}`);
        node.name = "attrui";
        node.attributes["scripting name"] = `instrument${i}`;
        node.custom = {
          fromJSON: mock(),
          getJSON: mock(() => ({ value: 0 })),
        };
        return node;
      });

      // Create patterns with unique state
      for (let p = 0; p < patterns; p++) {
        if (p > 0) presetFunction("new-pattern");

        for (let n = 0; n < nodes.length; n++) {
          presetManager.slots[n][p] = {
            [`node${n}`]: {
              node: nodes[n],
              state: { value: p * 100 + n, pattern: p },
            },
          };
        }
      }

      // Rapidly switch between patterns
      for (let i = 0; i < 50; i++) {
        const targetPattern = i % patterns;
        presetFunction(["switch-to-pattern", targetPattern]);

        // Verify state integrity after each switch
        for (let n = 0; n < nodes.length; n++) {
          const state = presetManager.slots[n][targetPattern][`node${n}`].state;
          expect(state.value).toBe(targetPattern * 100 + n);
          expect(state.pattern).toBe(targetPattern);
        }
      }
    });

    it("should handle pattern deletion edge cases", () => {
      // Create 3 patterns
      presetFunction("new-pattern");
      presetFunction("new-pattern");

      expect(presetManager.getNumberOfPatterns()).toBe(3);
      expect(presetManager.currentPattern).toBe(2);

      // Delete current pattern (should switch to previous)
      presetFunction("delete-pattern");
      expect(presetManager.getNumberOfPatterns()).toBe(2);
      expect(presetManager.currentPattern).toBe(1);

      // Delete first pattern while on second
      presetManager.switchToPattern(0);
      presetFunction("delete-pattern");
      expect(presetManager.getNumberOfPatterns()).toBe(1);
      expect(presetManager.currentPattern).toBe(0);

      // Try to delete last pattern (should not work)
      presetFunction("delete-pattern");
      expect(presetManager.getNumberOfPatterns()).toBe(1);
    });
  });

  describe("Zequencer Integration Scenarios", () => {
    beforeEach(() => {
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetObject.attributes.zequencerObjects = "drum,bass,lead";
      presetManager.slotMode = true;
    });

    it("should handle zequencer objects in pattern mode correctly", () => {
      // Create zequencer objects for each slot
      const zequencers = ["drum", "bass", "lead"].map((name, i) => {
        const node = new MockObjectNode(mockPatch, `zseq${i}`);
        node.name = "zequencer.core";
        node.attributes["scripting name"] = name;
        node.custom = {
          fromJSON: mock(),
          getJSON: mock(() => ({ steps: [] })),
        };
        return node;
      });

      // Set up pattern-specific zequencer states
      presetManager.slots[0][0] = {
        zseq0: { node: zequencers[0], state: { steps: [1, 0, 1, 0] } },
      };
      presetManager.slots[1][0] = {
        zseq1: { node: zequencers[1], state: { steps: [1, 1, 0, 0] } },
      };
      presetManager.slots[2][0] = {
        zseq2: { node: zequencers[2], state: { steps: [0, 1, 0, 1] } },
      };

      // Create new pattern
      presetFunction("new-pattern");

      // Modify zequencer states in new pattern
      presetManager.slots[0][1]["zseq0"].state = { steps: [0, 1, 0, 1] };
      presetManager.slots[1][1]["zseq1"].state = { steps: [1, 0, 1, 0] };
      presetManager.slots[2][1]["zseq2"].state = { steps: [1, 1, 1, 1] };

      // Switch patterns and verify zequencer-specific behavior
      presetFunction(["switch-to-pattern", 0]);
      expect(presetManager.slots[0][0]["zseq0"].state.steps).toEqual([1, 0, 1, 0]);

      presetFunction(["switch-to-pattern", 1]);
      expect(presetManager.slots[0][1]["zseq0"].state.steps).toEqual([0, 1, 0, 1]);
    });
  });

  describe("State Change Handling", () => {
    it("should handle live state changes during pattern operations", () => {
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetManager.slotMode = true;

      // Set up preset nodes
      presetManager.presetNodes = new Set(["attrui1", "attrui2"]);

      const node1 = new MockObjectNode(mockPatch, "attrui1");
      node1.name = "attrui";
      node1.attributes["scripting name"] = "synth1";

      const node2 = new MockObjectNode(mockPatch, "attrui2");
      node2.name = "attrui";
      node2.attributes["scripting name"] = "filter1";

      // Simulate state change via message queue
      const stateChange1: StateChange = { node: node1, state: { value: 42 } };
      const stateChange2: StateChange = { node: node2, state: { cutoff: 2000 } };

      // Trigger state changes
      (global as any).mockStateChangeCallback(stateChange1);
      (global as any).mockStateChangeCallback(stateChange2);

      // Verify state was captured in current slot/pattern
      expect(presetManager.slots[0][0]["attrui1"]).toEqual(stateChange1);
      expect(presetManager.slots[0][0]["attrui2"]).toEqual(stateChange2);
    });
  });

  describe("Voice and Polyphonic Scenarios", () => {
    it("should handle voice-specific preset changes correctly", () => {
      const synthNode = new MockObjectNode(mockPatch, "poly-synth");
      synthNode.name = "attrui";
      synthNode.custom = {
        fromJSON: mock(),
        getJSON: mock(() => ({ voices: 8 })),
      };

      // Set up presets for different voices
      presetManager.presets[0] = {
        "poly-synth": { node: synthNode, state: { voice: 0, freq: 440 } },
      };
      presetManager.presets[1] = {
        "poly-synth": { node: synthNode, state: { voice: 1, freq: 880 } },
      };

      // Switch presets for specific voices
      presetFunction({ voice: 0, preset: 0, time: 0 });
      presetFunction({ voice: 1, preset: 1, time: 100 });

      expect(presetManager.voiceToPreset.get(0)).toBe(0);
      expect(presetManager.voiceToPreset.get(1)).toBe(1);
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle save-as-new operations correctly", () => {
      presetObject.attributes.slotMode = true;
      presetManager.slotMode = true;
      presetManager.currentPreset = 0;

      const node = new MockObjectNode(mockPatch, "test-node");
      node.name = "attrui";

      // Set up state in current slot
      presetManager.slots[0][0] = {
        "test-node": { node, state: { value: 100 } },
      };

      // Save as new preset
      presetFunction("save-as-new");

      // Verify new preset was created
      const newPresetIndex = presetManager.presets.findIndex(
        (p) => Object.keys(p).length > 0 && p["test-node"]?.state.value === 100,
      );
      expect(newPresetIndex).toBeGreaterThan(-1);
    });

    it("should handle concurrent pattern operations", () => {
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetManager.slotMode = true;

      // Perform multiple operations rapidly
      const operations = [
        () => presetFunction("new-pattern"),
        () => presetFunction(["switch-to-pattern", 0]),
        () => presetFunction("new-pattern"),
        () => presetFunction(["switch-to-pattern", 1]),
        () => presetFunction("delete-pattern"),
      ];

      // Execute operations and verify no corruption
      for (const op of operations) {
        op();
        expect(presetManager.currentPattern).toBeGreaterThanOrEqual(0);
        expect(presetManager.getNumberOfPatterns()).toBeGreaterThan(0);
      }
    });
  });

  describe("Command Interface", () => {
    it("should handle all preset commands correctly", () => {
      // Number command
      const result1 = presetFunction(5);
      expect(result1).toEqual([["switch-to-preset", 5]]);
      expect(presetManager.currentPreset).toBe(5);

      // Update UI command
      const result2 = presetFunction("update-ui");
      expect(result2).toEqual([]);
      expect(presetObject.onNewValue).toHaveBeenCalled();

      // Delete command
      presetFunction(["delete", 3, 4, 5]);
      expect(Object.keys(presetManager.presets[3]).length).toBe(0);
      expect(Object.keys(presetManager.presets[4]).length).toBe(0);
      expect(Object.keys(presetManager.presets[5]).length).toBe(0);

      // Set name command
      presetFunction(["set-name", "Test Preset"]);
      expect(presetManager.presetNames[presetManager.currentPreset]).toBe("Test Preset");
    });

    it("should handle pattern reordering commands", () => {
      // Enable pattern mode
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetManager.slotMode = true;

      // Create multiple patterns
      for (let p = 0; p < 4; p++) {
        if (p > 0) presetFunction("new-pattern");
        
        const node = new MockObjectNode(mockPatch, `node${p}`);
        node.name = "attrui";
        presetManager.slots[0][p] = {
          [`node${p}`]: { node, state: { pattern: p, value: p * 10 } }
        };
      }

      // Test move-pattern-to command
      const moveResult = presetFunction(["move-pattern-to", 1, 3]);
      expect(moveResult).toEqual([["move-pattern-to", 1, 3]]);

      // Verify the pattern was moved
      expect(presetManager.slots[0][0][`node0`].state.pattern).toBe(0);
      expect(presetManager.slots[0][1][`node2`].state.pattern).toBe(2);
      expect(presetManager.slots[0][2][`node1`].state.pattern).toBe(1); // moved pattern 
      expect(presetManager.slots[0][3][`node3`].state.pattern).toBe(3);
    });

    it("should handle pattern commands in sequence", () => {
      presetObject.attributes.patternMode = true;
      presetObject.attributes.slotMode = true;
      presetManager.slotMode = true;

      // Create patterns
      presetFunction("new-pattern");
      presetFunction("new-pattern");
      presetFunction("new-pattern");
      
      expect(presetManager.getNumberOfPatterns()).toBe(4);

      // Move pattern around
      presetFunction(["move-pattern-to", 3, 0]);
      
      // Switch to moved pattern
      presetFunction(["switch-to-pattern", 0]);
      expect(presetManager.currentPattern).toBe(0);

      // Delete a pattern
      presetFunction(["switch-to-pattern", 2]);
      presetFunction("delete-pattern");
      expect(presetManager.getNumberOfPatterns()).toBe(3);
    });
  });
});
