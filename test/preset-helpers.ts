import { ObjectNode, Node } from "@/lib/nodes/types";
import { StateChange, Preset } from "@/lib/nodes/definitions/core/preset/types";
import { MockObjectNode } from "./mocks/MockObjectNode";
import { MockPatch } from "./mocks/MockPatch";

import { mock, expect } from "bun:test";

/**
 * Test helpers for preset system testing
 */

export interface TestNodeConfig {
  id: string;
  name: string;
  scriptingName?: string;
  initialState?: any;
}

export interface TestPresetState {
  [nodeId: string]: any;
}

export class PresetTestHelper {
  private patch: MockPatch;
  private nodes: Map<string, ObjectNode> = new Map();

  constructor() {
    this.patch = new MockPatch();
  }

  /**
   * Create a mock node for testing
   */
  createNode(config: TestNodeConfig): ObjectNode {
    const node = new MockObjectNode(this.patch, config.id);
    node.name = config.name;
    node.attributes["scripting name"] = config.scriptingName || "";

    if (config.initialState) {
      node.custom = {
        fromJSON: mock(() => {}),
        getJSON: mock(() => config.initialState),
      };
    }

    this.nodes.set(config.id, node);
    return node;
  }

  /**
   * Create a state change object
   */
  createStateChange(nodeId: string, state: any): StateChange {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found. Create it first with createNode()`);
    }
    return { node, state };
  }

  /**
   * Create a preset from a state configuration
   */
  createPreset(stateConfig: TestPresetState): Preset {
    const preset: Preset = {};

    for (const [nodeId, state] of Object.entries(stateConfig)) {
      preset[nodeId] = this.createStateChange(nodeId, state);
    }

    return preset;
  }

  /**
   * Create multiple nodes at once
   */
  createNodes(configs: TestNodeConfig[]): ObjectNode[] {
    return configs.map((config) => this.createNode(config));
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): ObjectNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Create a typical synthesizer setup for testing
   */
  createSynthSetup() {
    return {
      oscillator: this.createNode({
        id: "osc1",
        name: "attrui",
        scriptingName: "main-osc",
        initialState: { frequency: 440, waveform: "sine" },
      }),
      filter: this.createNode({
        id: "filter1",
        name: "attrui",
        scriptingName: "main-filter",
        initialState: { cutoff: 1000, resonance: 0.5 },
      }),
      envelope: this.createNode({
        id: "env1",
        name: "attrui",
        scriptingName: "main-env",
        initialState: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 },
      }),
      amplifier: this.createNode({
        id: "amp1",
        name: "attrui",
        scriptingName: "main-amp",
        initialState: { gain: 0.8 },
      }),
    };
  }

  /**
   * Create a zequencer setup for testing
   */
  createZequencerSetup() {
    return {
      drum: this.createNode({
        id: "drum-seq",
        name: "zequencer.core",
        scriptingName: "drum",
        initialState: { steps: [1, 0, 1, 0, 1, 0, 1, 0] },
      }),
      bass: this.createNode({
        id: "bass-seq",
        name: "zequencer.core",
        scriptingName: "bass",
        initialState: { steps: [1, 0, 0, 1, 0, 0, 1, 0] },
      }),
      lead: this.createNode({
        id: "lead-seq",
        name: "zequencer.core",
        scriptingName: "lead",
        initialState: { steps: [0, 1, 0, 1, 0, 1, 0, 1] },
      }),
    };
  }
}

/**
 * Assertion helpers for preset testing
 */
export class PresetAssertions {
  /**
   * Assert that a preset contains the expected state
   */
  static assertPresetState(preset: Preset, nodeId: string, expectedState: any) {
    expect(preset[nodeId]).toBeDefined();
    expect(preset[nodeId].state).toEqual(expectedState);
  }

  /**
   * Assert that slot has the expected state in a specific pattern
   */
  static assertSlotState(
    slots: Preset[][],
    slotIndex: number,
    patternIndex: number,
    nodeId: string,
    expectedState: any,
  ) {
    expect(slots[slotIndex]).toBeDefined();
    expect(slots[slotIndex][patternIndex]).toBeDefined();
    expect(slots[slotIndex][patternIndex][nodeId]).toBeDefined();
    expect(slots[slotIndex][patternIndex][nodeId].state).toEqual(expectedState);
  }

  /**
   * Assert that slot-to-preset mapping is correct
   */
  static assertSlotMapping(
    slotToPreset: { [slotNumber: number]: number[] },
    slotIndex: number,
    patternIndex: number,
    expectedPreset: number,
  ) {
    expect(slotToPreset[slotIndex]).toBeDefined();
    expect(slotToPreset[slotIndex][patternIndex]).toBe(expectedPreset);
  }

  /**
   * Assert that pattern count is correct
   */
  static assertPatternCount(slots: Preset[][], expectedCount: number) {
    if (slots.length > 0) {
      expect(slots[0].length).toBe(expectedCount);
    }
  }

  /**
   * Assert that all slots have the same number of patterns
   */
  static assertConsistentPatternCount(slots: Preset[][]) {
    if (slots.length === 0) return;

    const expectedCount = slots[0].length;
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].length).toBe(expectedCount);
    }
  }
}

/**
 * Create a complex test scenario for pattern mode bug reproduction
 */
export function createPatternModeBugScenario() {
  const helper = new PresetTestHelper();

  // Create typical live performance setup
  const setup = {
    ...helper.createSynthSetup(),
    ...helper.createZequencerSetup(),
    fx1: helper.createNode({
      id: "delay1",
      name: "attrui",
      scriptingName: "delay",
      initialState: { time: 0.25, feedback: 0.3, mix: 0.4 },
    }),
    fx2: helper.createNode({
      id: "reverb1",
      name: "attrui",
      scriptingName: "reverb",
      initialState: { roomSize: 0.5, damping: 0.7, mix: 0.2 },
    }),
  };

  return { helper, setup };
}

/**
 * Performance testing utilities
 */
export class PresetPerformanceHelper {
  /**
   * Time an operation and assert it completes within expected time
   */
  static async timeOperation<T>(operation: () => T | Promise<T>, maxTimeMs: number): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();

    expect(end - start).toBeLessThan(maxTimeMs);
    return result;
  }

  /**
   * Create large number of presets for stress testing
   */
  static createLargePresetSet(helper: PresetTestHelper, count: number) {
    const presets: Preset[] = [];

    for (let i = 0; i < count; i++) {
      const nodes = helper.createNodes([
        { id: `node${i}_1`, name: "attrui", scriptingName: `inst${i}_osc` },
        { id: `node${i}_2`, name: "attrui", scriptingName: `inst${i}_filter` },
        { id: `node${i}_3`, name: "attrui", scriptingName: `inst${i}_env` },
      ]);

      const preset = helper.createPreset({
        [`node${i}_1`]: { frequency: 440 + i * 10, waveform: "sine" },
        [`node${i}_2`]: { cutoff: 1000 + i * 50, resonance: 0.5 + i * 0.01 },
        [`node${i}_3`]: { attack: 0.1 + i * 0.001, release: 0.5 + i * 0.01 },
      });

      presets.push(preset);
    }

    return presets;
  }
}
