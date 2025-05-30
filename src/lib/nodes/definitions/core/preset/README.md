# Preset System

The preset system in Zen Plus is a comprehensive state management solution that supports multiple operational modes for storing, recalling, and managing parameter states across different contexts.

## Overview

The preset object allows you to capture, store, and recall the state of UI elements and parameters within a patch. It operates with a hierarchical approach where it can manage nodes that are "below" it in the patch hierarchy.

## Core Components

- **PresetManager**: Main class handling all preset operations
- **StateChange**: Interface for capturing node state changes
- **Preset**: Collection of state changes indexed by node ID
- **Slot**: Array of presets used in slot mode
- **SlotToPreset**: Mapping between slots and preset numbers

## Operating Modes

### 1. Basic Preset Mode (Default)
- **Description**: Standard preset functionality
- **Usage**: Store and recall up to 64 presets
- **Attributes**: `slotMode: false`
- **Behavior**: Direct preset switching with `switchToPreset(number)`

### 2. Slot Mode
- **Description**: Organizes presets into slots with pattern support
- **Usage**: Enables pattern-based preset organization
- **Attributes**: `slotMode: true`, `slots: number`
- **Behavior**: Presets are organized into slots, each slot can contain multiple patterns
- **Commands**:
  - `copy-to-slot`: Copy preset to specific slot
  - `write-to-memory`: Save current slot state to memory

### 3. Pattern Mode
- **Description**: Multi-pattern sequencing within slots
- **Usage**: Create pattern sequences for complex arrangements
- **Attributes**: `patternMode: true`
- **Behavior**: Each slot contains multiple patterns that can be switched
- **Commands**:
  - `new-pattern`: Create new pattern
  - `delete-pattern`: Remove current pattern
  - `switch-to-pattern`: Change to specific pattern

### 4. Voice/Polyphonic Mode
- **Description**: Per-voice preset management for polyphonic systems
- **Usage**: Assign different presets to different voices
- **Behavior**: Uses `voiceToPreset` mapping for voice-specific state
- **Methods**: `switchToPreset(presetNumber, voice, time)`

### 5. Zequencer Integration Mode
- **Description**: Special integration with Zequencer objects
- **Usage**: Pattern-specific control of zequencer objects
- **Attributes**: `zequencerObjects: string[]`, scripting names
- **Behavior**: Handles zequencer.core objects separately in pattern mode

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `showNames` | boolean | false | Display preset names in UI |
| `hidePatterns` | boolean | false | Hide pattern controls |
| `slotMode` | boolean | false | Enable slot-based organization |
| `slots` | number | 4 | Number of slots in slot mode |
| `patternMode` | boolean | false | Enable pattern functionality |
| `zequencerObjects` | string/array | "" | Zequencer object scripting names |
| `compactPatternMode` | boolean | false | Compact pattern display |
| `cellSize` | number | 20 | UI cell size |

## Commands

### Basic Commands
- `number`: Switch to preset number
- `"update-ui"`: Refresh UI display
- `["delete", ...numbers]`: Delete specified presets
- `["set-name", name]`: Set current preset name

### Slot Mode Commands
- `"write-to-memory"`: Save current slot to memory
- `"save-as-new"`: Save as new preset
- `["copy-to-slot", presetNumber, slotNumber]`: Copy preset to slot

### Pattern Mode Commands
- `"new-pattern"`: Create new pattern
- `"delete-pattern"`: Delete current pattern
- `["switch-to-pattern", patternNumber]`: Switch to pattern
- `["move-pattern-to", sourcePattern, targetPosition]`: Reorder patterns

### Voice Mode Commands
- `{voice: number, preset: number, time: number}`: Voice-specific preset switch

## State Management

### State Capture
- Listens for `statechanged` messages from child nodes
- Only captures nodes with scripting names or `attrui` objects
- Filters based on patch hierarchy (preset must be "above" the node)

### State Application
- Uses VM evaluation system for complex nodes
- Falls back to direct message passing for simple nodes
- Supports voice-specific and time-based application

### Serialization
- JSON serialization for persistence
- Handles node references through ID mapping
- Lazy hydration for performance

## Memory Management

### SharedArrayBuffer Integration
- Uses SharedArrayBuffer for efficient UI communication
- 64-byte buffer for preset status indicators
- Values: 0 (empty), 1 (has data), 2 (current)

### Hydration System
- Lazy loading of serialized presets
- Node reference resolution on demand
- Handles missing nodes gracefully

## Usage Examples

### Basic Preset
```javascript
// Switch to preset 5
presetObject.receive(0, 5);

// Set preset name
presetObject.receive(0, ["set-name", "Bass Patch"]);
```

### Slot Mode
```javascript
// Enable slot mode with 8 slots
object.attributes.slotMode = true;
object.attributes.slots = 8;

// Copy preset 3 to slot 1
presetObject.receive(0, ["copy-to-slot", 3, 1]);
```

### Pattern Mode
```javascript
// Enable pattern mode
object.attributes.patternMode = true;

// Create new pattern
presetObject.receive(0, "new-pattern");

// Switch to pattern 2
presetObject.receive(0, ["switch-to-pattern", 2]);

// Reorder patterns - move pattern 3 to position 1
presetObject.receive(0, ["move-pattern-to", 3, 1]);
// This changes order from [0,1,2,3,4] to [0,3,1,2,4]
```

### Voice Mode
```javascript
// Assign preset 5 to voice 2 at time 1000
presetObject.receive(0, {voice: 2, preset: 5, time: 1000});
```

## Integration Notes

### Zequencer Integration
- Special handling for `zequencer.core` objects
- Pattern-specific application based on scripting names
- Maintains separation between different zequencer instances

### VM Integration
- Uses VM evaluation system for complex state changes
- Merges multiple evaluations for batch processing
- Handles both main thread and worker thread execution

### UI Integration
- Provides callback system for UI updates
- SharedArrayBuffer for real-time status
- Resizable UI component support

## Performance Considerations

- Uses SharedArrayBuffer for efficient UI communication
- Lazy hydration of large preset collections
- Batch processing of state changes
- Debounced UI updates

## Testing

The preset system includes comprehensive testing to ensure reliability across all operating modes and edge cases.

### Test Structure

```
test/
├── preset.test.ts                    # Core unit tests
├── preset-integration.test.ts        # Integration and workflow tests
├── preset-bug-reproduction.test.ts   # Specific bug reproductions
└── preset-helpers.ts                 # Test utilities and helpers
```

### Running Tests

```bash
# Run all preset tests
bun test preset

# Run specific test file
bun test test/preset-bug-reproduction.test.ts

# Run with verbose output
bun test preset --verbose
```

### Test Categories

#### 1. Unit Tests (`preset.test.ts`)
- Basic preset operations (switch, create, delete)
- Slot mode operations
- Pattern mode operations  
- State management edge cases
- Serialization and hydration
- Performance tests

#### 2. Integration Tests (`preset-integration.test.ts`)
- Full command interface testing
- Zequencer integration scenarios
- Voice/polyphonic mode testing
- State change handling via message queue
- Complex workflow testing

#### 3. Bug Reproduction Tests (`preset-bug-reproduction.test.ts`)
- Specific reproduction of reported bugs
- Pattern + slot mode edge cases
- State corruption scenarios
- Rapid switching tests

### Test Helpers

The `preset-helpers.ts` file provides utilities for creating test scenarios:

```typescript
import { PresetTestHelper, PresetAssertions } from './test/preset-helpers';

// Create test nodes
const helper = new PresetTestHelper();
const synth = helper.createNode({
  id: "synth1",
  name: "attrui", 
  scriptingName: "lead-synth"
});

// Create presets
const preset = helper.createPreset({
  "synth1": { frequency: 440, amplitude: 0.8 }
});

// Assert state
PresetAssertions.assertSlotState(slots, 0, 1, "synth1", { frequency: 440 });
```

### Common Test Patterns

#### Testing Pattern Mode Bug
```typescript
it("should preserve state across pattern switches", () => {
  // 1. Set up initial state in pattern 0
  presetManager.slots[0][0] = createPreset(initialState);
  
  // 2. Create new pattern
  presetFunction("new-pattern");
  
  // 3. Modify state in pattern 1
  presetManager.slots[0][1] = createPreset(modifiedState);
  
  // 4. Switch back and forth
  presetFunction(["switch-to-pattern", 0]);
  presetFunction(["switch-to-pattern", 1]);
  
  // 5. Verify state integrity
  expect(presetManager.slots[0][1]["nodeId"].state.value).toBe(expectedValue);
});
```

#### Testing Complex Workflows
```typescript
it("should handle complex live performance scenario", () => {
  const { helper, setup } = createPatternModeBugScenario();
  
  // Test realistic usage patterns
  // - Multiple pattern creation
  // - Rapid pattern switching
  // - Concurrent state changes
  // - Preset recall during pattern operations
});
```

### Testing Edge Cases

The test suite covers critical edge cases:

- **Empty State Handling**: Operations with empty presets/slots
- **Boundary Conditions**: Single pattern, maximum slots, etc.
- **Concurrent Operations**: Rapid switching, simultaneous state changes
- **Memory Management**: Large preset sets, deep object states
- **Integration Points**: Zequencer objects, voice management, VM evaluation

### Performance Testing

Performance tests ensure the system scales:

```typescript
it("should handle large preset operations efficiently", () => {
  const start = performance.now();
  
  // Perform intensive operations
  for (let i = 0; i < 1000; i++) {
    presetManager.switchToPreset(i % 64);
  }
  
  const end = performance.now();
  expect(end - start).toBeLessThan(100); // Should be fast
});
```

### Debugging Test Failures

When tests fail:

1. **Check Console Output**: Tests log detailed state information
2. **Verify Mock Setup**: Ensure nodes and dependencies are properly mocked
3. **State Inspection**: Use breakpoints to examine preset/slot state
4. **Isolation Testing**: Run individual test cases to isolate issues

### Writing New Tests

When adding new preset functionality:

1. **Unit Tests**: Test the specific method/feature in isolation
2. **Integration Tests**: Test the feature in realistic workflows  
3. **Edge Cases**: Consider boundary conditions and error states
4. **Performance**: Ensure new features don't degrade performance

### Continuous Integration

Tests are designed to be:
- **Fast**: Complete test suite runs in <5 seconds
- **Reliable**: No flaky tests or race conditions
- **Comprehensive**: High coverage of critical paths
- **Maintainable**: Clear test structure and helper functions

## Parameter Locks (P-Locks)

Parameter locks (p-locks) are step-specific parameter overrides that work similarly to Elektron devices. They allow individual sequencer steps to have different parameter values that temporarily override the main preset.

### Overview

P-locks provide per-step parameter control, enabling complex parameter automation without requiring separate automation tracks. When a step with p-locks triggers, those parameter values override the main preset only for that step.

### Core Components

- **stepParameterLocks**: Map of step IDs to preset objects containing step-specific parameter overrides
- **currentVoicePLocks**: Per-voice tracking of currently active p-locks for proper cleanup
- **selectedSteps**: Array of currently selected step IDs for p-lock editing
- **preStepSelectionState**: Stored preset state to restore when step selection changes

### P-Lock Workflow

#### 1. Creating P-Locks (Step Selection Mode)

**User selects steps in zequencer UI:**
1. StepsContext detects step selection change
2. Sends worker message with step IDs to VM
3. VM calls `setSelectedSteps()` on all preset managers
4. PresetManager stores original preset state if first selection
5. Applies existing p-locks for selected steps to UI

**User edits parameters while steps selected:**
1. Parameter change triggers `statechanged` event
2. PresetManager checks if steps are selected
3. If steps selected: stores change in `stepParameterLocks[stepId]` for each selected step
4. If no steps selected: stores in normal preset system

**User changes step selection:**
1. PresetManager restores original preset first (undoes previous step p-locks)
2. Applies p-locks for newly selected steps (if any exist)
3. Updates UI to show current p-lock values

**User deselects all steps:**
1. PresetManager restores original preset
2. Clears stored selection state
3. UI returns to base preset values

#### 2. Playing P-Locks (Performance Mode)

**Step triggers during playback:**
1. Zequencer sends message: `{voice: number, preset: number, time: number, id: stepId}`
2. PresetManager calls `switchToPreset(presetNumber, voice, time, stepId)`
3. P-lock processing occurs before main preset application

**P-lock application logic:**
1. **Check previous p-locks**: If voice has active p-locks, prepare to undo them
2. **Calculate diff**: Identify which parameters need undoing vs. which will be overridden
3. **Selective undo**: Apply base preset values only for parameters not in new p-locks
4. **Apply new p-locks**: Apply step-specific parameter overrides
5. **Track state**: Store current p-locks in `currentVoicePLocks[voice]`
6. **Apply main preset**: Apply main preset normally

### P-Lock Cases and Behaviors

#### Case 1: Basic P-Lock Application
```
Base preset: frequency=440Hz, cutoff=1000Hz, resonance=0.5
Step 2 p-locks: frequency=880Hz
Result: frequency=880Hz, cutoff=1000Hz, resonance=0.5
```

#### Case 2: Multiple Parameter P-Locks
```
Base preset: frequency=440Hz, cutoff=1000Hz, resonance=0.5
Step 3 p-locks: frequency=660Hz, cutoff=2000Hz
Result: frequency=660Hz, cutoff=2000Hz, resonance=0.5
```

#### Case 3: P-Lock to No P-Lock (Undo)
```
Step 1: No p-locks → Apply base preset
Step 2: frequency=880Hz, cutoff=2000Hz → Apply p-locks
Step 3: No p-locks → Undo p-locks, restore frequency=440Hz, cutoff=1000Hz
```

#### Case 4: P-Lock to Different P-Lock (Transition)
```
Step 1: frequency=880Hz, cutoff=2000Hz → Apply p-locks A
Step 2: frequency=660Hz, resonance=0.8 → Undo cutoff only, apply frequency+resonance
Result: frequency=660Hz, cutoff=1000Hz (base), resonance=0.8
```

#### Case 5: P-Lock to P-Lock with Shared Parameters
```
Step 1: frequency=880Hz, cutoff=2000Hz → Apply p-locks A
Step 2: frequency=1200Hz, cutoff=1500Hz → Update frequency+cutoff, no undo needed
Result: frequency=1200Hz, cutoff=1500Hz, resonance=0.5 (base)
```

#### Case 6: Same Preset, Different P-Locks
```
Voice 0, Step 1: Preset 1 + frequency=880Hz → Apply preset + p-locks
Voice 0, Step 2: Preset 1 + cutoff=2000Hz → Undo frequency, apply cutoff
Result: frequency=440Hz (base), cutoff=2000Hz
```

#### Case 7: Polyphonic P-Locks
```
Voice 0, Step 1: Preset 1 + frequency=880Hz → Apply to voice 0
Voice 1, Step 1: Preset 1 + frequency=660Hz → Apply to voice 1 
Voice 0, Step 2: Preset 1 (no p-locks) → Undo p-locks from voice 0 only
Result: Voice 0 has base preset, Voice 1 retains frequency=660Hz
```

#### Case 8: Step Selection UI Behavior
```
No selection: UI shows base preset values
Select step 2 (has frequency p-lock): UI shows frequency=880Hz
Select step 3 (has cutoff p-lock): UI restores base, then shows cutoff=2000Hz
Select step 2 again: UI shows frequency=880Hz
Deselect all: UI shows base preset values
```

#### Case 9: Multiple Step Selection
```
Select steps 2+3:
- Step 2 has frequency=880Hz
- Step 3 has cutoff=2000Hz
Result: UI shows combined p-locks (frequency=880Hz, cutoff=2000Hz)
Edit resonance=0.8: Both steps get resonance p-lock added
```

#### Case 10: Overlapping Step Selection
```
Select steps 2+3+4:
- Step 2: frequency=880Hz
- Step 3: frequency=660Hz, cutoff=2000Hz  
- Step 4: resonance=0.8
Result: UI shows last-wins for conflicts (frequency=660Hz from step 3)
```

### Edge Cases and Error Handling

#### Edge Case 1: Missing Base Preset Parameters
```
Base preset: frequency=440Hz (missing cutoff)
Step p-lock: cutoff=2000Hz
Undo behavior: Skip undoing cutoff (no base value to restore)
```

#### Edge Case 2: Zequencer.core Parameter Changes
```
Zequencer objects are excluded from p-lock system
Pattern-level changes go to normal slot/preset system
Step-level parameter changes are filtered out
```

#### Edge Case 3: Same Step Triggered Rapidly
```
Voice 0, Step 2 triggers twice quickly:
1st trigger: Apply p-locks
2nd trigger: Previous p-locks already match, apply efficiently
```

#### Edge Case 4: Voice Allocation Changes
```
Voice mapping changes during playback:
- currentVoicePLocks tracks per-voice state independently
- Voice reassignment doesn't affect other voices' p-locks
```

### Serialization and Persistence

#### JSON Structure
```json
{
  "stepParameterLocks": {
    "step_id_1": {
      "node_id_1": {"state": value1},
      "node_id_2": {"state": value2}
    },
    "step_id_2": {
      "node_id_1": {"state": value3}
    }
  }
}
```

#### Hydration Process
1. **Load**: JSON → `serializedStepParameterLocks`
2. **Hydrate**: Find node references, convert to live `stepParameterLocks`
3. **Filter**: Skip zequencer objects and nodes without scripting names
4. **Validate**: Handle missing nodes gracefully

### Testing P-Locks

#### Test Categories

**1. Basic P-Lock Operations**
- Create p-locks by selecting steps and editing parameters
- Apply p-locks during step playback
- Verify parameter values override base preset correctly

**2. Step Selection UI Tests**
- Test step selection/deselection behavior
- Verify UI shows correct p-lock values
- Test multiple step selection with overlapping p-locks

**3. P-Lock Transition Tests**
- No p-lock → p-lock → no p-lock sequences
- P-lock → different p-lock transitions  
- Shared parameter handling between consecutive p-locks

**4. Polyphonic P-Lock Tests**
- Multiple voices with different p-locks
- Voice-specific p-lock undo behavior
- Voice mapping changes during playback

**5. Performance Mode Tests**
- Rapid step triggering with p-locks
- Same preset with different p-locks per step
- Complex sequence patterns with p-locks

**6. Serialization Tests**
- Save/load projects with p-locks
- Hydration with missing nodes
- JSON structure validation

**7. Edge Case Tests**
- Zequencer.core parameter filtering
- Missing base preset parameters
- Empty p-lock handling
- Memory cleanup and leak prevention

#### Test Helpers

```typescript
// P-Lock test utilities
class PLockTestHelper {
  createStepPLocks(stepId: string, parameters: Record<string, any>): void
  selectSteps(stepIds: string[]): void
  triggerStep(stepId: string, voice: number, preset: number): void
  assertPLockState(stepId: string, nodeId: string, expectedValue: any): void
  assertVoiceState(voice: number, nodeId: string, expectedValue: any): void
}

// Example test
it("should handle p-lock to different p-lock transition", () => {
  const helper = new PLockTestHelper();
  
  // Set up base preset
  helper.createBasePreset({ frequency: 440, cutoff: 1000 });
  
  // Create p-locks for different steps
  helper.createStepPLocks("step1", { frequency: 880, cutoff: 2000 });
  helper.createStepPLocks("step2", { frequency: 660, resonance: 0.8 });
  
  // Trigger sequence
  helper.triggerStep("step1", 0, 1); // Apply step1 p-locks
  helper.triggerStep("step2", 0, 1); // Transition to step2 p-locks
  
  // Verify only cutoff was undone, frequency updated, resonance added
  helper.assertVoiceState(0, "frequency", 660);
  helper.assertVoiceState(0, "cutoff", 1000); // restored to base
  helper.assertVoiceState(0, "resonance", 0.8);
});
```

### Implementation Notes

#### Performance Considerations
- P-locks only affect parameters that actually have locks (minimal overhead)
- Selective undo prevents unnecessary parameter updates
- Per-voice tracking scales efficiently with polyphonic systems

#### Memory Management
- `currentVoicePLocks` automatically cleans up when voices change
- Serialization uses same efficient system as regular presets
- No memory leaks from abandoned p-lock state

#### Integration Points
- StepsContext handles UI step selection
- VM handles worker thread message passing
- PresetManager coordinates all p-lock logic
- Zequencer provides step trigger events with IDs

This p-lock system provides professional-grade per-step parameter automation while maintaining the performance and reliability of the existing preset system.