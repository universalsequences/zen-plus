# Zequencer

The Zequencer is a step sequencer with polyphonic capabilities.

## Data Structure

Instead of a simple array of steps, the Zequencer now stores steps as an array of arrays:
```
node.steps = [
  [step1_voice1, step1_voice2, ...],
  [step2_voice1, step2_voice2, ...],
  ...
]
```

Each step can have multiple voices, with each voice being a complete GenericStepData object with its own parameters.

## API

- Core sends messages to UI via `onNewValues` with the current step number
- UI interacts with steps via operations like toggle, move, delete
- When triggered, all voices for a given step are output

## Polyphony

- Each step position can have multiple independent voices
- Each voice has its own complete set of parameters
- The UI displays only the first voice for simplicity
- Operations can target specific voices or all voices at a step

## Implementation Notes

This is a breaking change from the previous implementation that had a flat array of steps. The polyphonic implementation allows for multiple independent triggers at the same step position with completely different parameter configurations.