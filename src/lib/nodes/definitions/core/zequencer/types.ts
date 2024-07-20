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

// Create a utility type to convert an array of field schemas to a step type
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

export interface BaseStepData {
  on: boolean;
}

export const SetFieldForStepSchema = v.object({
  stepNumber: v.number(),
  name: v.string(),
  value: v.union([v.boolean(), v.number()]),
});

export type SetFieldForStepMessage = v.InferInput<typeof SetFieldForStepSchema>;

export type GenericStepData = BaseStepData & {
  [key: string]: boolean | number;
};
