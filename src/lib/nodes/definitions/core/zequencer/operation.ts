import type { Message } from "@/lib/nodes/types";
import { deleteStep } from "./deleteStep";
import { moveStep } from "./moveStep";
import * as v from "valibot";
import { setFieldForStep } from "./setFieldToStep";
import {
  DeleteStepSchema,
  MoveStepSchema,
  type SetFieldForStepMessage,
  SetFieldForStepSchema,
  type DeleteStepMessage,
  type GenericStepData,
  type MoveStepMessage,
  type StepDataSchema,
  ToggleStepSchema,
  MultiplyPatternLengthSchema,
  LegatoStepsSchema,
} from "./types";
import { toggleStep } from "./toggleStep";
import { multiplyPatternLength } from "./multiplyPatternLength";
import { legatoSteps } from "./legatoSteps";

// Define a generic operation type
export type Operation<
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
> = {
  schema: TSchema;
  apply: (
    operation: v.InferOutput<TSchema>,
    steps: GenericStepData[],
    userDefinedSchema: StepDataSchema,
  ) => {
    steps: GenericStepData[];
    schema: StepDataSchema;
  };
};

// messages received by zequencer.core node are validated against various
// schemas to determine the operation to be performed
export const operationsRegistry = [
  {
    schema: DeleteStepSchema,
    apply: deleteStep,
  },
  {
    schema: MoveStepSchema,
    apply: moveStep,
  },
  {
    schema: SetFieldForStepSchema,
    apply: setFieldForStep,
  },
  {
    schema: ToggleStepSchema,
    apply: toggleStep,
  },
  {
    schema: MultiplyPatternLengthSchema,
    apply: multiplyPatternLength,
  },
  {
    schema: LegatoStepsSchema,
    apply: legatoSteps,
  },
] as const as readonly Operation<
  v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>[];

type OperationsRegistry = typeof operationsRegistry;

function handleOperationImpl<
  T extends readonly Operation<
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
  >[],
>(
  registry: T,
  message: Message,
  steps: GenericStepData[],
  stepDataSchema: StepDataSchema,
) {
  for (const operation of registry) {
    const parsed = v.safeParse(operation.schema, message);
    if (parsed.success) {
      return {
        success: true as const,
        ...operation.apply(parsed.output, steps, stepDataSchema),
      };
    }
  }
  return {
    success: false as const,
  };
}

export const handleOperation = (
  message: Message,
  steps: GenericStepData[],
  stepDataSchema: StepDataSchema,
) => {
  return handleOperationImpl(
    operationsRegistry,
    message,
    steps,
    stepDataSchema,
  );
};
