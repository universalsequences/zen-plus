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
  console.log("setup schema called with length=%s", length);
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
        const newStep: MyStep = {
          ...sourceStep,
          stepNumber: i,
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

// The getDefaultStep function remains unchanged
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
      stepNumber,
      on: false,
      parameterLocks: [],
    } as MyStep,
  );
};
