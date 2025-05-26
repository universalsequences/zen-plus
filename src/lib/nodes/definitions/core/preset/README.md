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