import type { Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";
import { MutableValue } from "../MutableValue";
import {
  type FieldSchema,
  StepSchema,
  type StepDataSchema,
  type BaseStepData,
  type TickMessage,
  TickSchema,
  type StepFromSchemas,
  type SetFieldForStepMessage,
  SetFieldForStepSchema,
  GenericStepData,
} from "./types";
import * as v from "valibot";
import { confirmPasswordReset } from "firebase/auth";
import { userDefinedType_arg2 } from "@/lib/nodes/typechecker";
import { setFieldForStep } from "./setFieldToStep";

doc("zequencer", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "A sequencer that can be controlled by messages.",
});

export const zequencer = <Schemas extends readonly FieldSchema[]>(
  node: ObjectNode,
) => {
  if (!node.custom) {
    node.custom = new MutableValue(node);
  }

  // user defined schema (saved whenever it changes)
  let schema: StepDataSchema | undefined = node.stepsSchema;

  // the steps for this sequencer
  const steps: (BaseStepData & StepFromSchemas<Schemas>)[] =
    (node.steps as (BaseStepData & StepFromSchemas<Schemas>)[]) || [];

  // store them in the node
  node.steps = steps as GenericStepData[];

  // Function to handle the schema and create steps
  const handleSchema = (userDefinedSchema: StepDataSchema) => {
    node.stepsSchema = userDefinedSchema;
    type MyStep = BaseStepData & StepFromSchemas<Schemas>;

    // Initialize the steps list with the inferred type and default values
    for (let i = 0; i < 16; i++) {
      const step = userDefinedSchema.reduce(
        (acc, field) => {
          const fieldName = field.name as keyof MyStep;
          if (steps[i]?.[fieldName] !== undefined) {
            acc[fieldName] = steps[i][fieldName] as MyStep[keyof MyStep];
          } else {
            acc[fieldName] = field.default as MyStep[keyof MyStep];
          }
          return acc;
        },
        {
          on: true,
        } as MyStep,
      );
      steps[i] = step;
    }
    schema = userDefinedSchema;
    console.log("steps", steps);
    console.log("schema", schema);
  };

  // form of a message: {time, stepNumber} (very simple)
  // step sequencer is a list of steps that can be triggered by a message
  // the special part is that steps can be anything, not just your standard
  // midi-like messages. There should be a "schema" that is applied to all
  // the steps by default and can be edited by the UI
  return (message: Message) => {
    // schema will come in the form of an object
    // so operation: ["schema", [{name: "transpose", min: 0, max: 12, default: 0}]
    const parsedSchema = v.safeParse(StepSchema, message);
    if (parsedSchema.success) {
      const schema: StepDataSchema = parsedSchema.output;
      handleSchema(schema);
      return [];
    }

    const parsedSetFieldForStep = v.safeParse(SetFieldForStepSchema, message);
    if (parsedSetFieldForStep.success) {
      setFieldForStep(parsedSetFieldForStep.output, schema, steps);
      return [];
    }

    const parsedTick = v.safeParse(TickSchema, message);
    if (!parsedTick.success) {
      // not a tick so ignore
      return [];
    }

    // handle tick
    const tick: TickMessage = parsedTick.output;

    const stepNumber = tick.stepNumber % steps.length;
    if (steps[stepNumber].on) {
      return [
        {
          time: tick.time,
          ...steps[stepNumber],
        },
      ];
    }
  };
};
