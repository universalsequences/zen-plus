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
  steps: GenericStepData[],
  schema: StepDataSchema | undefined,
) => {
  const { stepNumber, name, value } = setFieldMessage;
  if (steps[stepNumber]) {
    // Ensure the field exists in the step schema before updating
    const schemaField = schema?.find((f) => f.name === name);
    if (name === "on" && typeof value === "boolean") {
      steps[stepNumber].on = value;
    } else if (schemaField) {
      type StepType = BaseStepData & StepFromSchemas<Schemas>;
      const fieldKey = name as keyof StepType;

      // Type guard to check if the key exists in StepType
      const isKeyOfStepType = (key: string): key is keyof StepType => {
        return key in (steps[stepNumber] as StepType);
      };

      // Ensure the type of fieldValue matches the expected type
      if (
        typeof value === typeof schemaField.default &&
        isKeyOfStepType(fieldKey)
      ) {
        (steps[stepNumber] as StepType)[fieldKey] =
          value as StepType[typeof fieldKey];
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
