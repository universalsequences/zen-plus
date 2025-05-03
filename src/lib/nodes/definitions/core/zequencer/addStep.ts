import { getDefaultStep } from "./setupSchema";
import type {
  AddStepMessage,
  FieldSchema,
  GenericStepData,
  StepDataSchema,
  StepFromSchemas
} from "./types";

/**
 * Adds a new step at the specified position with the specified pitch value.
 * Unlike toggle, this will not turn off existing steps, allowing for polyphonic/chord creation.
 */
export const addStep = <Schemas extends readonly FieldSchema[]>(
  addStepMessage: AddStepMessage,
  steps: GenericStepData[][],
  schema: StepDataSchema,
) => {
  const { stepNumber, pitchField, pitchValue } = addStepMessage;
  
  // Ensure the step number is within valid range
  if (stepNumber < 0 || stepNumber >= steps.length) {
    return { steps, schema };
  }
  
  // Create a copy of the steps to modify
  const updatedSteps = [...steps.map(voices => [...voices])];
  
  // Get all steps at the target position
  let stepsAtPosition = updatedSteps[stepNumber];
  
  // First, filter out any OFF steps at this position
  // We keep only steps that are ON
  const activeSteps = stepsAtPosition.filter(step => step.on);
  
  // Replace the steps array with only the active steps
  updatedSteps[stepNumber] = activeSteps;
  
  // Create a new default step
  const newStep = getDefaultStep(stepNumber, schema);
  
  // Turn it on and set the pitch value
  newStep.on = true;
  newStep[pitchField] = pitchValue;
  
  // Add the new step to the array for this position
  updatedSteps[stepNumber].push(newStep);
  
  return { steps: updatedSteps, schema };
};
