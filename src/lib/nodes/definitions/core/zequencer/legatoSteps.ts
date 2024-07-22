import type {
  BaseStepData,
  FieldSchema,
  GenericStepData,
  LegatoStepsMessage,
  StepDataSchema,
  StepFromSchemas,
} from "./types";

export const legatoSteps = <Schemas extends readonly FieldSchema[]>(
  legatoMessage: LegatoStepsMessage,
  steps: GenericStepData[],
  schema: StepDataSchema | undefined,
) => {
  const { stepsToLegato } = legatoMessage;
  const updatedSteps = [...steps] as (BaseStepData &
    StepFromSchemas<Schemas>)[];

  // Sort selected steps to process them in order
  const sortedSelectedSteps = [...stepsToLegato].sort((a, b) => a - b);

  for (let i = 0; i < sortedSelectedSteps.length; i++) {
    const currentStepIndex = sortedSelectedSteps[i];
    const currentStep = updatedSteps[currentStepIndex];

    if (currentStep && "duration" in currentStep) {
      let nextStepIndex: number;

      // For the last selected step, always use the next step in the larger pattern
      if (i === sortedSelectedSteps.length - 1) {
        nextStepIndex = (currentStepIndex + 1) % updatedSteps.length;
      } else {
        nextStepIndex = sortedSelectedSteps[i + 1];
      }

      // Calculate the new duration
      const newDuration =
        nextStepIndex > currentStepIndex
          ? nextStepIndex - currentStepIndex
          : updatedSteps.length - currentStepIndex + nextStepIndex;

      currentStep.duration = newDuration;
    }
  }

  return { schema, steps: updatedSteps };
};
