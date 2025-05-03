import { getDefaultStep } from "./setupSchema";
import type {
  BaseStepData,
  FieldSchema,
  GenericStepData,
  StepDataSchema,
  StepFromSchemas,
  ToggleStepMessage,
} from "./types";

// Generate a unique ID for a step
const generateStepId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

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
    
    // Check if any voice at this step is on
    const anyStepIsOn = steps[stepNumberToToggle].some(step => step.on);
    
    if (anyStepIsOn) {
      // If any voice is on, turn them all off and remove extra steps
      const defaultStep = getDefaultStep(stepNumberToToggle, schema);
      steps[stepNumberToToggle] = [defaultStep]; // Keep only one default step
    } else {
      // If all steps are off, turn on the specified voice
      // Ensure the requested voice exists
      while (steps[stepNumberToToggle].length <= voiceIndex) {
        const template = { ...steps[stepNumberToToggle][0] };
        template.on = false;
        
        // Ensure the template has an ID
        if (!template.id) {
          template.id = generateStepId();
        }
        
        steps[stepNumberToToggle].push(template);
      }
      
      // Get the target step and ensure it has a valid ID
      const step = steps[stepNumberToToggle][voiceIndex] as BaseStepData & StepFromSchemas<Schemas>;
      if (!step.id) {
        step.id = generateStepId();
      }
      
      // Set the step to ON
      step.on = true;
    }
  }

  return { steps: [...steps], schema };
};
