import type {
  SetFieldForStepMessage,
  StepDataSchema,
  StepFromSchemas,
  BaseStepData,
  FieldSchema,
  GenericStepData,
} from "./types";

export const setFieldForStep = <Schemas extends readonly FieldSchema[]>(
  setFieldMessage: SetFieldForStepMessage,
  steps: GenericStepData[][],
  schema: StepDataSchema | undefined,
) => {
  const { stepNumber, name, value, voiceIndex = 0, stepId } = setFieldMessage;

  // First try to find the step by ID if provided
  if (stepId) {
    let foundStep: GenericStepData | null = null;
    let foundStepPosition = { stepNumber: -1, voiceIndex: -1 };

    // Search for the step with matching ID
    for (let i = 0; i < steps.length; i++) {
      const voices = steps[i];
      for (let j = 0; j < voices.length; j++) {
        if (voices[j].id === stepId) {
          foundStep = voices[j];
          foundStepPosition = { stepNumber: i, voiceIndex: j };
          break;
        }
      }
      if (foundStep) break;
    }

    // If step was found by ID, update it
    if (foundStep) {
      // Ensure the field exists in the step schema before updating
      const schemaField = schema?.find((f) => f.name === name);
      if (name === "on" && typeof value === "boolean") {
        foundStep.on = value;
      } else if (schemaField) {
        type StepType = BaseStepData & StepFromSchemas<Schemas>;
        const fieldKey = name as keyof StepType;

        // Type guard to check if the key exists in StepType
        const isKeyOfStepType = (key: string): key is keyof StepType => {
          return key in (foundStep as StepType);
        };

        // Ensure the type of fieldValue matches the expected type
        if (typeof value === typeof schemaField.default && isKeyOfStepType(fieldKey)) {
          (foundStep as StepType)[fieldKey] = value as StepType[typeof fieldKey];
        } else {
          console.error(
            `Type mismatch or invalid field for ${name}. Expected ${typeof schemaField.default}, got ${typeof value}.`,
          );
        }
      } else {
        console.error(`Field ${name} not found in schema.`);
      }

      return { steps: [...steps], schema };
    }
  }

  // Fall back to the traditional stepNumber/voiceIndex approach if no ID was provided
  // or if the step wasn't found by ID
  if (steps[stepNumber] && steps[stepNumber].length > 0) {
    // Add a new voice if trying to set a voice that doesn't exist yet
    if (voiceIndex >= steps[stepNumber].length) {
      // Create new voices up to the requested voice index
      while (steps[stepNumber].length <= voiceIndex) {
        // Clone the first voice as a template but with 'on' set to false
        const template = { ...steps[stepNumber][0] };
        template.on = false;
        steps[stepNumber].push(template);
      }
    }

    // Ensure the field exists in the step schema before updating
    const schemaField = schema?.find((f) => f.name === name);
    if (name === "on" && typeof value === "boolean") {
      steps[stepNumber][voiceIndex].on = value;
    } else if (schemaField) {
      type StepType = BaseStepData & StepFromSchemas<Schemas>;
      const fieldKey = name as keyof StepType;

      // Type guard to check if the key exists in StepType
      const isKeyOfStepType = (key: string): key is keyof StepType => {
        return key in (steps[stepNumber][voiceIndex] as StepType);
      };

      // Ensure the type of fieldValue matches the expected type
      if (typeof value === typeof schemaField.default && isKeyOfStepType(fieldKey)) {
        (steps[stepNumber][voiceIndex] as StepType)[fieldKey] = value as StepType[typeof fieldKey];
      } else {
        console.error(
          `Type mismatch or invalid field for ${name}. Expected ${typeof schemaField.default}, got ${typeof value}.`,
        );
      }
    } else {
      console.error(`Field ${name} not found in schema.`);
    }
  }

  return { steps: [...steps], schema };
};
