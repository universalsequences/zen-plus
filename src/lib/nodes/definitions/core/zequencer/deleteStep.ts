import type { Operation } from "./operation";
import { getDefaultStep } from "./setupSchema";
import type {
  DeleteStepMessage,
  DeleteStepSchema,
  FieldSchema,
  GenericStepData,
  MoveStepMessage,
  StepDataSchema,
} from "./types";

export const deleteStep = (
  deleteSteps: DeleteStepMessage,
  steps: GenericStepData[][],
  userDefinedSchema: StepDataSchema,
) => {
  // Create a deep copy of the steps to modify
  const stepsAfterDelete = steps.map(voices => [...voices]);

  // Handle deletion by step numbers
  for (const stepNumber of deleteSteps.stepsToDelete) {
    if (stepNumber >= 0 && stepNumber < stepsAfterDelete.length) {
      // Replace with a default step with a single voice
      stepsAfterDelete[stepNumber] = [getDefaultStep(stepNumber, userDefinedSchema)];
    }
  }

  // Handle deletion by step IDs if available
  if (deleteSteps.stepIdsToDelete && deleteSteps.stepIdsToDelete.length > 0) {
    const idsToDelete = new Set(deleteSteps.stepIdsToDelete);
    
    // Scan through all steps and reset those matching the IDs to delete
    for (let i = 0; i < stepsAfterDelete.length; i++) {
      const voices = stepsAfterDelete[i];
      const voicesWithIdsToDelete = voices.filter(voice => idsToDelete.has(voice.id));
      
      // If there are voices to delete at this position
      if (voicesWithIdsToDelete.length > 0) {
        // If all voices at this position are to be deleted, replace with a default step
        if (voicesWithIdsToDelete.length === voices.length) {
          stepsAfterDelete[i] = [getDefaultStep(i, userDefinedSchema)];
        } else {
          // Otherwise, filter out only the voices with IDs to delete
          stepsAfterDelete[i] = voices.filter(voice => !idsToDelete.has(voice.id));
          
          // If all voices were filtered out, add a default step
          if (stepsAfterDelete[i].length === 0) {
            stepsAfterDelete[i] = [getDefaultStep(i, userDefinedSchema)];
          }
        }
      }
    }
  }

  return { steps: stepsAfterDelete, schema: userDefinedSchema };
};
