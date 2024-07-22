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
  steps: GenericStepData[],
  userDefinedSchema: StepDataSchema,
) => {
  const stepsAfterDelete = [...steps];

  for (const stepNumber of deleteSteps.stepsToDelete) {
    stepsAfterDelete[stepNumber] = getDefaultStep(
      stepNumber,
      userDefinedSchema,
    );
  }

  return { steps: stepsAfterDelete, schema: userDefinedSchema };
};
