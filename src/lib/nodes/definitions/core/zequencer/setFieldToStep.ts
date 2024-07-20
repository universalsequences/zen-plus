import type {
  SetFieldForStepMessage,
  StepDataSchema,
  StepFromSchemas,
  BaseStepData,
  FieldSchema,
} from "./types";

export const setFieldForStep = <Schemas extends readonly FieldSchema[]>(
  setFieldMessage: SetFieldForStepMessage,
  schema: StepDataSchema | undefined,
  steps: (BaseStepData & StepFromSchemas<Schemas>)[],
) => {
  const { stepNumber, name, value } = setFieldMessage;
  if (steps[stepNumber]) {
    // Ensure the field exists in the step schema before updating
    const schemaField = schema?.find((f) => f.name === name);
    if (name === "on" && typeof value === "boolean") {
      steps[stepNumber].on = value;
    } else if (schemaField) {
      const fieldKey = name as keyof (BaseStepData & StepFromSchemas<Schemas>);
      // Ensure the type of fieldValue matches the expected type
      if (typeof value === typeof schemaField.default) {
        steps[stepNumber][fieldKey] = value as (BaseStepData &
          StepFromSchemas<Schemas>)[typeof fieldKey];
        console.log(`Updated step ${stepNumber} field ${name} to ${value}`);
      } else {
        console.error(
          `Type mismatch for field ${name}. Expected ${typeof schemaField.default}, got ${typeof value}.`,
        );
      }
    } else {
      console.error(`Field ${name} not found in schema.`);
    }
  }
};
