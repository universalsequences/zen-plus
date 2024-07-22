import { getDefaultStep } from "./setupSchema";
import type {
  BaseStepData,
  FieldSchema,
  GenericStepData,
  StepDataSchema,
  StepFromSchemas,
  ToggleStepMessage,
} from "./types";

export const toggleStep = <Schemas extends readonly FieldSchema[]>(
  toggleMessage: ToggleStepMessage,
  steps: GenericStepData[],
  schema: StepDataSchema,
) => {
  const { stepNumberToToggle } = toggleMessage;

  if (stepNumberToToggle >= 0 && stepNumberToToggle < steps.length) {
    const step = steps[stepNumberToToggle] as BaseStepData &
      StepFromSchemas<Schemas>;
    if (step.on) {
      steps[stepNumberToToggle] = getDefaultStep(stepNumberToToggle, schema);
    } else {
      // If the step is off, simply turn it on
      step.on = true;
    }
  }

  return { steps: [...steps], schema };
};
