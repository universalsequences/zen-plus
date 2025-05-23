import * as v from "valibot";

const FieldSchema = v.object({
  name: v.string(),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  default: v.union([v.boolean(), v.number()]),
});

export type FieldSchema = v.InferInput<typeof FieldSchema>;

export const StepSchema = v.array(FieldSchema);

export type StepDataSchema = v.InferInput<typeof StepSchema>;

// utility type to convert an array of field schemas to a step type
export type StepFromSchemas<Schemas extends readonly FieldSchema[]> = {
  [K in Schemas[number]["name"]]: Schemas[number] extends {
    name: K;
    default: infer D;
  }
    ? D
    : never;
};

export const TickSchema = v.object({
  time: v.number(),
  stepNumber: v.number(),
});

export type TickMessage = v.InferInput<typeof TickSchema>;

export interface ParameterLock {
  id: string;
  value: number;
}

export interface BaseStepData {
  id: string;
  on: boolean;
  stepNumber: number;
  parameterLocks: ParameterLock[];
}

export const SetFieldForStepSchema = v.object({
  stepNumber: v.number(),
  name: v.string(),
  value: v.union([v.boolean(), v.number()]),
  voiceIndex: v.optional(v.number()),
  stepId: v.optional(v.string()), // Add stepId for direct step targeting
});

export type SetFieldForStepMessage = v.InferInput<typeof SetFieldForStepSchema>;

export type GenericStepData = BaseStepData & {
  [key: string]: boolean | number;
};

export const MoveStepSchema = v.object({
  fromStepNumber: v.number(),
  toStepNumber: v.number(),
  selectedSteps: v.optional(v.array(v.number())),
});

export type MoveStepMessage = v.InferInput<typeof MoveStepSchema>;

export const DeleteStepSchema = v.object({
  stepsToDelete: v.array(v.number()),
  stepIdsToDelete: v.optional(v.array(v.string())),
});

export type DeleteStepMessage = v.InferInput<typeof DeleteStepSchema>;

// Define the schema for the toggle step message
export const ToggleStepSchema = v.object({
  stepNumberToToggle: v.number(),
  voiceIndex: v.optional(v.number()),
});

// Define the type for the toggle step message
export type ToggleStepMessage = v.InferInput<typeof ToggleStepSchema>;

// Define the schema for the toggle step message
export const MultiplyPatternLengthSchema = v.object({
  patternLengthMultiple: v.number(),
});

// Define the type for the toggle step message
export type MultiplyPatternLengthMessage = v.InferInput<
  typeof MultiplyPatternLengthSchema
>;

// Define the schema for the legato steps message
export const LegatoStepsSchema = v.object({
  stepsToLegato: v.array(v.number()),
});

// Define the type for the legato steps message
export type LegatoStepsMessage = v.InferOutput<typeof LegatoStepsSchema>;

// Define the schema for the add step message
export const AddStepSchema = v.object({
  stepNumber: v.number(),
  pitchField: v.string(),
  pitchValue: v.number(),
});

// Define the type for the add step message
export type AddStepMessage = v.InferOutput<typeof AddStepSchema>;

