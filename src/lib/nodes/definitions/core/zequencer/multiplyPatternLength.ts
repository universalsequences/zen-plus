import { setupSchema } from "./setupSchema";
import type {
  GenericStepData,
  MultiplyPatternLengthMessage,
  StepDataSchema,
} from "./types";

export const multiplyPatternLength = (
  message: MultiplyPatternLengthMessage,
  steps: GenericStepData[],
  schema: StepDataSchema,
) => {
  const { patternLengthMultiple } = message;

  const goalPatternLength = Math.floor(steps.length * patternLengthMultiple);
  return {
    steps: setupSchema(schema, steps, goalPatternLength),
    schema,
  };
};
