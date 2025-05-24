import type { ObjectNode } from "@/lib/nodes/types";
import type {
  BaseStepData,
  FieldSchema,
  GenericStepData,
  StepDataSchema,
  StepFromSchemas,
} from "./types";

export const setupSchema = <Schemas extends readonly FieldSchema[]>(
  userDefinedSchema: StepDataSchema,
  existingSteps: (BaseStepData & StepFromSchemas<Schemas>)[][],
  length: number,
) => {
  type MyStep = BaseStepData & StepFromSchemas<Schemas>;
  const steps: MyStep[][] = [];

  // If there are no existing steps, create the first step with default values
  if (existingSteps.length === 0) {
    steps.push([getDefaultStep<Schemas>(0, userDefinedSchema)]);
  }

  // Duplicate the pattern to fill the new length
  for (let i = steps.length; i < length; i++) {
    const sourceIndex = i % existingSteps.length;
    const sourceStepArray = existingSteps[sourceIndex] || [];

    if (sourceStepArray.length > 0) {
      // Clone the source steps for this position
      const newStepArray: MyStep[] = sourceStepArray.map((sourceStep) => {
        // Determine if this is a duplicate or a step that needs to retain its ID
        // If the source index matches the current index, it's the original step, otherwise it's a duplicate
        const isNewDuplicate = sourceIndex !== i;

        const newStep: MyStep = {
          ...sourceStep,
          stepNumber: i,
          // Generate new IDs for duplicated steps, keep original IDs only for original steps
          id: isNewDuplicate ? generateStepId() : sourceStep.id || generateStepId(),
        };

        // Ensure all fields from the schema are present
        for (const field of userDefinedSchema) {
          const fieldName = field.name as keyof MyStep;
          if (!(fieldName in newStep)) {
            newStep[fieldName] = field.default as MyStep[keyof MyStep];
          }
        }

        return newStep;
      });

      steps.push(newStepArray);
    } else {
      // If there's no source step, create a default step
      steps.push([getDefaultStep<Schemas>(i, userDefinedSchema)]);
    }
  }

  return steps;
};

// Generate a unique ID for a step
const generateStepId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// The getDefaultStep function now includes a unique ID
export const getDefaultStep = <Schemas extends readonly FieldSchema[]>(
  stepNumber: number,
  userDefinedSchema: StepDataSchema,
) => {
  type MyStep = BaseStepData & StepFromSchemas<Schemas>;
  return userDefinedSchema.reduce(
    (acc, field) => {
      const fieldName = field.name as keyof MyStep;
      acc[fieldName] = field.default as MyStep[keyof MyStep];
      return acc;
    },
    {
      id: generateStepId(),
      stepNumber,
      on: false,
      parameterLocks: [],
    } as MyStep,
  );
};
