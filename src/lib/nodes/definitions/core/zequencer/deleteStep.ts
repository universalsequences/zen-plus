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

  for (const stepNumber of deleteSteps.stepsToDelete) {
    if (stepNumber >= 0 && stepNumber < stepsAfterDelete.length) {
      // Replace with a default step with a single voice
      stepsAfterDelete[stepNumber] = [getDefaultStep(stepNumber, userDefinedSchema)];
    }
  }

  return { steps: stepsAfterDelete, schema: userDefinedSchema };
};
