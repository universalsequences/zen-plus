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
  steps: GenericStepData[][],
  schema: StepDataSchema,
) => {
  const { stepNumberToToggle, voiceIndex = 0 } = toggleMessage;

  if (stepNumberToToggle >= 0 && stepNumberToToggle < steps.length) {
    // Ensure there's at least one voice for this step
    if (!steps[stepNumberToToggle] || steps[stepNumberToToggle].length === 0) {
      steps[stepNumberToToggle] = [getDefaultStep(stepNumberToToggle, schema)];
    }
    
    // Ensure the requested voice exists
    while (steps[stepNumberToToggle].length <= voiceIndex) {
      const template = { ...steps[stepNumberToToggle][0] };
      template.on = false;
      steps[stepNumberToToggle].push(template);
    }
    
    const step = steps[stepNumberToToggle][voiceIndex] as BaseStepData & StepFromSchemas<Schemas>;
    
    if (step.on) {
      // Reset the voice to default with 'on' set to false
      const defaultStep = getDefaultStep(stepNumberToToggle, schema);
      steps[stepNumberToToggle][voiceIndex] = defaultStep;
    } else {
      // If the step is off, simply turn it on
      step.on = true;
    }
  }

  return { steps: [...steps], schema };
};
