import { describe, it, expect, beforeEach, mock } from "bun:test";
import { PresetTestHelper, PresetAssertions, createPatternModeBugScenario } from "./preset-helpers";
import { MockObjectNode } from "./mocks/MockObjectNode";
import { MockPatch } from "./mocks/MockPatch";
import { ObjectNode, Message } from "@/lib/nodes/types";
import { PresetManager, preset } from "@/lib/nodes/definitions/core/preset/index";

// Mock dependencies
mock.module("@/lib/messaging/queue", () => ({
  subscribe: mock(() => {}),
}));

mock.module("@/lib/nodes/traverse", () => ({
  getRootPatch: mock(() => ({
    registerNodes: mock(() => {}),
  })),
}));

describe("Preset Bug Reproduction: Pattern + Slot Mode", () => {
  let presetObject: ObjectNode;
  let presetManager: PresetManager;
  let presetFunction: (x: Message) => Message[];
  let helper: PresetTestHelper;
  let setup: any;

  beforeEach(() => {
    const scenario = createPatternModeBugScenario();
    helper = scenario.helper;
    setup = scenario.setup;

    const mockPatch = new MockPatch();
    presetObject = new MockObjectNode(mockPatch);
    presetObject.updateWorkerState = mock(() => {});
    presetObject.onNewValue = mock(() => {});

    // Configure for the reported bug scenario
    presetObject.attributes.patternMode = true;
    presetObject.attributes.slotMode = true;
    presetObject.attributes.slots = 4;

    presetFunction = preset(presetObject);
    presetManager = presetObject.custom as PresetManager;
    presetManager.slotMode = true;
  });

  describe("Exact Bug Reproduction", () => {
    it("CRITICAL: new pattern should preserve and recall state correctly", () => {
      // STEP 1: Set up initial state in slot 0, pattern 0
      console.log("=== BUG REPRODUCTION TEST ===");
      console.log("Step 1: Setting up initial state in pattern 0");

      presetManager.currentPreset = 0;
      const initialState = {
        [setup.oscillator.id]: { frequency: 440, waveform: "sine", amplitude: 0.8 },
        [setup.filter.id]: { cutoff: 1200, resonance: 0.7, type: "lowpass" },
        [setup.envelope.id]: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.8 },
        [setup.amplifier.id]: { gain: 0.9, pan: 0.0 },
      };

      // Populate pattern 0 with initial state
      presetManager.slots[0][0] = helper.createPreset(initialState);
      presetManager.slotToPreset[0] = [1]; // maps to preset 1

      console.log("Initial pattern 0 state:", Object.keys(presetManager.slots[0][0]));
      console.log("OSC frequency:", presetManager.slots[0][0][setup.oscillator.id].state.frequency);
      console.log("Filter cutoff:", presetManager.slots[0][0][setup.filter.id].state.cutoff);

      // STEP 2: Create new pattern (this triggers the bug)
      console.log("\nStep 2: Creating new pattern");
      const newPatternResult = presetFunction("new-pattern");
      expect(newPatternResult).toEqual([["new-pattern", "bang"]]);

      const newPatternIndex = presetManager.currentPattern;
      expect(newPatternIndex).toBe(1);
      console.log("Created new pattern:", newPatternIndex);

      // Verify state was copied to new pattern
      PresetAssertions.assertSlotState(presetManager.slots, 0, 1, setup.oscillator.id, {
        frequency: 440,
        waveform: "sine",
        amplitude: 0.8,
      });
      console.log(
        "New pattern OSC frequency:",
        presetManager.slots[0][1][setup.oscillator.id].state.frequency,
      );

      // STEP 3: Modify state in new pattern (pattern 1)
      console.log("\nStep 3: Modifying state in new pattern");
      const modifiedState = {
        [setup.oscillator.id]: { frequency: 880, waveform: "sawtooth", amplitude: 0.6 },
        [setup.filter.id]: { cutoff: 2400, resonance: 0.9, type: "highpass" },
        [setup.envelope.id]: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.4 },
        [setup.amplifier.id]: { gain: 0.7, pan: 0.2 },
      };

      presetManager.slots[0][1] = helper.createPreset(modifiedState);
      console.log(
        "Modified OSC frequency in pattern 1:",
        presetManager.slots[0][1][setup.oscillator.id].state.frequency,
      );
      console.log(
        "Modified filter cutoff in pattern 1:",
        presetManager.slots[0][1][setup.filter.id].state.cutoff,
      );

      // STEP 4: Switch to different pattern (back to pattern 0)
      console.log("\nStep 4: Switching to pattern 0");
      const switchResult1 = presetFunction(["switch-to-pattern", 0]);
      expect(switchResult1).toEqual([["switch-to-pattern", 0]]);
      expect(presetManager.currentPattern).toBe(0);
      console.log("Current pattern:", presetManager.currentPattern);

      // Verify we're back to original state
      PresetAssertions.assertSlotState(presetManager.slots, 0, 0, setup.oscillator.id, {
        frequency: 440,
        waveform: "sine",
        amplitude: 0.8,
      });

      // STEP 5: Return to new pattern (pattern 1) - BUG OCCURS HERE
      console.log("\nStep 5: Switching back to new pattern (WHERE BUG OCCURS)");
      const switchResult2 = presetFunction(["switch-to-pattern", 1]);
      expect(switchResult2).toEqual([["switch-to-pattern", 1]]);
      expect(presetManager.currentPattern).toBe(1);
      console.log("Current pattern:", presetManager.currentPattern);

      // STEP 6: CRITICAL - Verify state is preserved correctly
      console.log("\nStep 6: CRITICAL TEST - Verifying state preservation");

      const retrievedState = presetManager.slots[0][1];
      console.log(
        "Retrieved pattern 1 OSC frequency:",
        retrievedState[setup.oscillator.id].state.frequency,
      );
      console.log(
        "Retrieved pattern 1 filter cutoff:",
        retrievedState[setup.filter.id].state.cutoff,
      );

      // These assertions should pass if the bug is fixed
      expect(retrievedState[setup.oscillator.id].state.frequency).toBe(880);
      expect(retrievedState[setup.oscillator.id].state.waveform).toBe("sawtooth");
      expect(retrievedState[setup.filter.id].state.cutoff).toBe(2400);
      expect(retrievedState[setup.filter.id].state.type).toBe("highpass");
      expect(retrievedState[setup.envelope.id].state.attack).toBe(0.05);
      expect(retrievedState[setup.amplifier.id].state.gain).toBe(0.7);

      // Verify slot-to-preset mapping is maintained
      expect(presetManager.slotToPreset[0][1]).toBe(1);

      console.log("=== BUG REPRODUCTION TEST COMPLETE ===");
    });

    it("should handle multiple new patterns without state corruption", () => {
      // Create a sequence of patterns with distinct states
      const patterns = [];

      for (let p = 0; p < 5; p++) {
        if (p > 0) {
          presetFunction("new-pattern");
        }

        const patternState = {
          [setup.oscillator.id]: { frequency: 440 + p * 110, pattern: p },
          [setup.filter.id]: { cutoff: 1000 + p * 500, pattern: p },
        };

        presetManager.slots[0][p] = helper.createPreset(patternState);
        patterns.push(patternState);

        console.log(`Pattern ${p} OSC frequency: ${patternState[setup.oscillator.id].frequency}`);
      }

      // Test switching between all patterns multiple times
      for (let iteration = 0; iteration < 3; iteration++) {
        console.log(`\n=== Iteration ${iteration + 1} ===`);

        for (let p = 0; p < patterns.length; p++) {
          presetFunction(["switch-to-pattern", p]);

          const currentState = presetManager.slots[0][p];
          const expectedFreq = 440 + p * 110;
          const actualFreq = currentState[setup.oscillator.id].state.frequency;

          console.log(`Pattern ${p}: Expected ${expectedFreq}, Got ${actualFreq}`);
          expect(actualFreq).toBe(expectedFreq);
          expect(currentState[setup.oscillator.id].state.pattern).toBe(p);
        }
      }
    });

    it("should handle rapid pattern switching without corruption", () => {
      // Create 3 patterns with very different states
      const patternConfigs = [
        { freq: 220, cutoff: 500, name: "Bass" },
        { freq: 440, cutoff: 1000, name: "Mid" },
        { freq: 880, cutoff: 2000, name: "High" },
      ];

      patternConfigs.forEach((config, p) => {
        if (p > 0) presetFunction("new-pattern");

        presetManager.slots[0][p] = helper.createPreset({
          [setup.oscillator.id]: { frequency: config.freq, name: config.name },
          [setup.filter.id]: { cutoff: config.cutoff, name: config.name },
        });
      });

      // Rapidly switch between patterns in random order
      const switchSequence = [2, 0, 1, 2, 1, 0, 2, 0, 1, 0];

      switchSequence.forEach((targetPattern, i) => {
        presetFunction(["switch-to-pattern", targetPattern]);

        const state = presetManager.slots[0][targetPattern];
        const config = patternConfigs[targetPattern];

        expect(state[setup.oscillator.id].state.frequency).toBe(config.freq);
        expect(state[setup.filter.id].state.cutoff).toBe(config.cutoff);
        expect(state[setup.oscillator.id].state.name).toBe(config.name);

        console.log(
          `Switch ${i}: Pattern ${targetPattern} (${config.name}) - Freq: ${state[setup.oscillator.id].state.frequency}`,
        );
      });
    });
  });

  describe("Edge Cases That Might Cause the Bug", () => {
    it("should handle pattern operations with empty slots", () => {
      // Create new pattern with some slots empty
      presetFunction("new-pattern");

      // Only populate slot 0, leave others empty
      presetManager.slots[0][1] = helper.createPreset({
        [setup.oscillator.id]: { frequency: 660 },
      });

      // Switch patterns - should not corrupt empty slots
      presetFunction(["switch-to-pattern", 0]);
      presetFunction(["switch-to-pattern", 1]);

      expect(presetManager.slots[0][1][setup.oscillator.id].state.frequency).toBe(660);
      expect(presetManager.slots[1][1]).toEqual({});
    });

    it("should handle pattern deletion affecting slot mappings", () => {
      // Create 3 patterns
      presetFunction("new-pattern");
      presetFunction("new-pattern");

      // Set up distinct mappings
      presetManager.slotToPreset[0] = [1, 2, 3];

      // Delete middle pattern
      presetManager.switchToPattern(1);
      presetFunction("delete-pattern");

      // Verify mappings are adjusted correctly
      expect(presetManager.getNumberOfPatterns()).toBe(2);
      expect(presetManager.currentPattern).toBe(1); // should adjust to valid pattern
    });

    it("should handle concurrent state changes during pattern operations", () => {
      // Set up preset nodes for state change detection
      presetManager.presetNodes = new Set([setup.oscillator.id, setup.filter.id]);

      // Create new pattern
      presetFunction("new-pattern");

      // Simulate state changes happening during pattern operations
      const stateChange = {
        node: setup.oscillator,
        state: { frequency: 1000, source: "live-change" },
      };

      // This would normally come through the message queue
      if (presetManager.slotMode) {
        const slot = presetManager.slots[presetManager.currentPreset];
        if (slot?.[presetManager.currentPattern]) {
          slot[presetManager.currentPattern][setup.oscillator.id] = stateChange;
        }
      }

      // Switch pattern and verify state is preserved
      presetFunction(["switch-to-pattern", 0]);
      presetFunction(["switch-to-pattern", 1]);

      const currentState = presetManager.slots[0][1][setup.oscillator.id];
      expect(currentState.state.frequency).toBe(1000);
      expect(currentState.state.source).toBe("live-change");
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle pattern operations with zequencer integration", () => {
      // Configure zequencer integration
      presetManager.objectNode.attributes.zequencerObjects = "drum,bass,lead";

      // Set up zequencer nodes in slots
      presetManager.slots[0][0] = helper.createPreset({
        [setup.drum.id]: { steps: [1, 0, 1, 0], bpm: 120 },
      });

      presetFunction("new-pattern");
      presetManager.slots[0][1] = helper.createPreset({
        [setup.drum.id]: { steps: [1, 1, 1, 1], bpm: 140 },
      });

      // Switch patterns and verify zequencer state
      presetFunction(["switch-to-pattern", 0]);
      expect(presetManager.slots[0][0][setup.drum.id].state.bpm).toBe(120);

      presetFunction(["switch-to-pattern", 1]);
      expect(presetManager.slots[0][1][setup.drum.id].state.bpm).toBe(140);
    });

    it("should maintain state integrity across preset + pattern operations", () => {
      // Create complex state with multiple types of data
      const complexState = {
        [setup.oscillator.id]: {
          frequency: 440,
          waveform: "sine",
          modulation: { rate: 5, depth: 0.1 },
          envelope: { attack: 0.1, release: 0.5 },
        },
        [setup.filter.id]: {
          cutoff: 1200,
          resonance: 0.7,
          envelope: { amount: 0.5, rate: 2 },
          lfo: { rate: 0.5, amount: 200 },
        },
      };

      presetManager.slots[0][0] = helper.createPreset(complexState);

      // Create new pattern and modify complex state
      presetFunction("new-pattern");
      const modifiedComplexState = {
        [setup.oscillator.id]: {
          ...complexState[setup.oscillator.id],
          frequency: 880,
          modulation: { rate: 10, depth: 0.2 },
        },
        [setup.filter.id]: {
          ...complexState[setup.filter.id],
          cutoff: 2400,
          lfo: { rate: 1.0, amount: 400 },
        },
      };

      presetManager.slots[0][1] = helper.createPreset(modifiedComplexState);

      // Test switching preserves deep object state
      presetFunction(["switch-to-pattern", 0]);
      const pattern0State = presetManager.slots[0][0];
      expect(pattern0State[setup.oscillator.id].state.modulation.rate).toBe(5);
      expect(pattern0State[setup.filter.id].state.lfo.amount).toBe(200);

      presetFunction(["switch-to-pattern", 1]);
      const pattern1State = presetManager.slots[0][1];
      expect(pattern1State[setup.oscillator.id].state.modulation.rate).toBe(10);
      expect(pattern1State[setup.filter.id].state.lfo.amount).toBe(400);
    });
  });

  describe("Pattern Reordering in Live Performance", () => {
    beforeEach(() => {
      presetManager.slotMode = true;
      presetObject.attributes.slotMode = true;
      presetObject.attributes.patternMode = true;
    });

    it("should handle pattern reordering during live performance", () => {
      // Create a typical live performance setup with 8 patterns
      for (let p = 0; p < 8; p++) {
        if (p > 0) presetFunction("new-pattern");
        
        // Each pattern has different settings for all instruments
        presetManager.slots[0][p] = helper.createPreset({
          [setup.oscillator.id]: { frequency: 220 + (p * 55), pattern: p },
          [setup.filter.id]: { cutoff: 500 + (p * 200), pattern: p },
          [setup.drum.id]: { steps: new Array(8).fill(0).map((_, i) => (i + p) % 2), pattern: p }
        });
      }

      // Start on pattern 4
      presetFunction(["switch-to-pattern", 4]);
      expect(presetManager.currentPattern).toBe(4);

      // Move pattern 7 to position 1 (common live performance move)
      presetFunction(["move-pattern-to", 7, 1]);

      // Expected order: [0, 7, 1, 2, 3, 4, 5, 6]
      // Current pattern 4 should now be at position 5
      expect(presetManager.currentPattern).toBe(5);

      // Verify the moved pattern has correct state
      const movedPattern = presetManager.slots[0][1];
      expect(movedPattern[setup.oscillator.id].state.pattern).toBe(7);
      expect(movedPattern[setup.oscillator.id].state.frequency).toBe(220 + (7 * 55));

      // Switch to the moved pattern and verify it works
      presetFunction(["switch-to-pattern", 1]);
      expect(presetManager.currentPattern).toBe(1);
      expect(presetManager.slots[0][1][setup.oscillator.id].state.pattern).toBe(7);
    });

    it("should handle multiple rapid reorderings", () => {
      // Create 6 patterns with identifiable content
      for (let p = 0; p < 6; p++) {
        if (p > 0) presetFunction("new-pattern");
        
        presetManager.slots[0][p] = helper.createPreset({
          [setup.oscillator.id]: { id: `pattern_${p}`, index: p }
        });
      }

      // Perform a series of rapid reorderings (simulating live performance)
      const moves = [
        [5, 0], // Move last to first: [5,0,1,2,3,4]
        [3, 1], // Move pattern to second: [5,2,0,1,3,4] 
        [0, 5], // Move first to last: [2,0,1,3,4,5]
        [2, 0], // Move to first: [1,2,0,3,4,5]
      ];

      for (const [source, target] of moves) {
        presetFunction(["move-pattern-to", source, target]);
      }

      // Verify final order: [pattern_1, pattern_2, pattern_0, pattern_3, pattern_5, pattern_4]
      expect(presetManager.slots[0][0][setup.oscillator.id].state.id).toBe("pattern_1");
      expect(presetManager.slots[0][1][setup.oscillator.id].state.id).toBe("pattern_2");
      expect(presetManager.slots[0][2][setup.oscillator.id].state.id).toBe("pattern_0");
      expect(presetManager.slots[0][3][setup.oscillator.id].state.id).toBe("pattern_3");
      expect(presetManager.slots[0][4][setup.oscillator.id].state.id).toBe("pattern_5");
      expect(presetManager.slots[0][5][setup.oscillator.id].state.id).toBe("pattern_4");
    });

    it("should preserve pattern integrity during reordering with state changes", () => {
      // Create 4 patterns
      for (let p = 0; p < 4; p++) {
        if (p > 0) presetFunction("new-pattern");
        
        presetManager.slots[0][p] = helper.createPreset({
          [setup.oscillator.id]: { frequency: 440 + (p * 110), pattern: p },
          [setup.filter.id]: { cutoff: 1000 + (p * 500), pattern: p }
        });
      }

      // Switch to pattern 2 and modify its state
      presetFunction(["switch-to-pattern", 2]);
      presetManager.slots[0][2][setup.oscillator.id].state.frequency = 999;

      // Move the modified pattern to position 0
      presetFunction(["move-pattern-to", 2, 0]);

      // The modified pattern should now be at position 0 with preserved changes
      expect(presetManager.slots[0][0][setup.oscillator.id].state.frequency).toBe(999);
      expect(presetManager.slots[0][0][setup.oscillator.id].state.pattern).toBe(2);

      // Current pattern should have moved with the pattern
      expect(presetManager.currentPattern).toBe(0);
    });

    it("should handle edge case: reordering with only one pattern", () => {
      // Start with just one pattern
      expect(presetManager.getNumberOfPatterns()).toBe(1);

      // Try to move the only pattern
      presetFunction(["move-pattern-to", 0, 0]);

      // Should be a no-op
      expect(presetManager.getNumberOfPatterns()).toBe(1);
      expect(presetManager.currentPattern).toBe(0);
    });

    it("should handle reordering with cross-slot dependencies", () => {
      presetManager.setNumberOfSlots(3);

      // Create 3 patterns with cross-slot state
      for (let p = 0; p < 3; p++) {
        if (p > 0) presetFunction("new-pattern");
        
        for (let s = 0; s < 3; s++) {
          const nodeId = `slot${s}_pattern${p}`;
          const node = helper.createNode({
            id: nodeId,
            name: "attrui",
            scriptingName: `instrument_${s}`
          });
          
          presetManager.slots[s][p] = {
            [nodeId]: { node, state: { slot: s, pattern: p, value: s * 10 + p }}
          };
        }
      }

      // Move pattern 2 to position 0
      presetFunction(["move-pattern-to", 2, 0]);

      // Verify all slots maintained their cross-dependencies
      // Expected order: [2, 0, 1]
      for (let s = 0; s < 3; s++) {
        const p0State = presetManager.slots[s][0][`slot${s}_pattern2`].state;
        const p1State = presetManager.slots[s][1][`slot${s}_pattern0`].state;
        const p2State = presetManager.slots[s][2][`slot${s}_pattern1`].state;

        expect(p0State).toEqual({ slot: s, pattern: 2, value: s * 10 + 2 });
        expect(p1State).toEqual({ slot: s, pattern: 0, value: s * 10 + 0 });
        expect(p2State).toEqual({ slot: s, pattern: 1, value: s * 10 + 1 });
      }
    });
  });
});
