import type { Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";
import { MutableValue } from "../MutableValue";
import {
  type FieldSchema,
  StepSchema,
  type StepDataSchema,
  type TickMessage,
  TickSchema,
  GenericStepData,
} from "./types";
import * as v from "valibot";
import { setupSchema } from "./setupSchema";
import { handleOperation } from "./operation";

doc("zequencer.core", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "A sequencer that can be controlled by messages.",
});

export const zequencer = <Schemas extends readonly FieldSchema[]>(node: ObjectNode) => {
  if (!node.custom) {
    node.custom = new MutableValue(node, 0, false);
  }

  if (!node.attributes.name) {
    // serves as link to zequencer.ui
    node.attributes.name = "";
  }

  if (!node.attributes.length) {
    node.attributes.length = 16;
  }

  node.attributeCallbacks.length = (length: number | boolean | string | number[]) => {
    if (node.stepsSchema) {
      node.steps = setupSchema(node.stepsSchema, node.steps || [], length as number);
      node.stepsSchema = schema;
      updateUI();
    }
  };

  // user defined schema (saved whenever it changes)
  let schema: StepDataSchema | undefined = node.stepsSchema;

  // the steps for this sequencer

  // form of a message: {time, stepNumber} (very simple)
  // step sequencer is a list of steps that can be triggered by a message
  // the special part is that steps can be anything, not just your standard
  // midi-like messages. There should be a "schema" that is applied to all
  // the steps by default and can be edited by the UI

  let lastStepNumber = 0;

  const updateUI = () => {
    if (node.onNewValues && node.steps) {
      const xyz = [lastStepNumber, node.steps];
      for (const id in node.onNewValues) {
        node.onNewValues[id](xyz);
      }
    }

    if (node.custom && node.steps) {
      node.custom.value = node.steps.map(x => ({... x})) as Message[];
    }
  };

  return (message: Message) => {
    if (Array.isArray(message) && node.steps) {
      const keys = Object.keys(message[0]);
      if (Object.keys(node.steps[0]).every((x) => keys.includes(x))) {
        node.steps = message as GenericStepData[];
        updateUI();
        return [];
      }
    }
    // schema will come in the form of an object
    // so operation: ["schema", [{name: "transpose", min: 0, max: 12, default: 0}]
    const parsedSchema = v.safeParse(StepSchema, message);
    if (parsedSchema.success) {
      schema = parsedSchema.output;
      node.steps = setupSchema(schema, node.steps || [], node.attributes.length as number);
      node.stepsSchema = schema;
      updateUI();
      return [];
    }

    const parsedTick = v.safeParse(TickSchema, message);
    if (parsedTick.success) {
      // not a tick so ignore
      // handle tick
      const tick: TickMessage = parsedTick.output;

      if (!node.steps) {
        // schema has not been received yet so ignore
        return [];
      }

      const stepNumber = tick.stepNumber % node.steps.length;
      lastStepNumber = stepNumber;
      updateUI();

      if (node.steps[stepNumber].on) {
        return [
          {
            time: tick.time,
            ...node.steps[stepNumber],
          },
        ];
      }
      return [];
    }

    if (node.steps && node.stepsSchema) {
      const operationResult = handleOperation(message, node.steps, node.stepsSchema);

      if (operationResult.success) {
        node.steps = operationResult.steps;
        node.stepsSchema = operationResult.schema;
        updateUI();

        return [];
      }
    }

    return [];
  };
};
