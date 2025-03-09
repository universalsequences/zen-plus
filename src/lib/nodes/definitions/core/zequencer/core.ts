import type { AttributeValue, Message, ObjectNode } from "@/lib/nodes/types";
import { doc } from "../doc";
import { MutableValue } from "../MutableValue";
import {
  type FieldSchema,
  StepSchema,
  type StepDataSchema,
  type TickMessage,
  TickSchema,
  GenericStepData,
  ParameterLock,
} from "./types";
import * as v from "valibot";
import { setupSchema } from "./setupSchema";
import { handleOperation } from "./operation";
import { getRootPatch } from "@/lib/nodes/traverse";

doc("zequencer.core", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "A sequencer that can be controlled by messages.",
});

export const zequencer = <Schemas extends readonly FieldSchema[]>(node: ObjectNode) => {
  console.log("ZEQ=", node);
  node.branching = true;
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

  node.attributeCallbacks.length = (length: AttributeValue) => {
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
      node.custom.value = node.steps.map((x) => ({ ...x })) as Message[];
    }
  };

  const objectCache: { [x: string]: ObjectNode } = {};

  const findObject = (id: string): ObjectNode | null => {
    if (objectCache[id]) return objectCache[id];

    const rootPatch = getRootPatch(node.patch);
    const searchResult = rootPatch.getAllNodes().find((x) => x.id === id);
    if (searchResult) {
      objectCache[id] = searchResult;
      return searchResult;
    }
    return null;
  };

  const handleParameterLocks = (locks: ParameterLock[], time: number) => {
    for (const lock of locks) {
      const { id, value } = lock;
      const object = findObject(id);
      if (!object) {
        console.error("object not found for plock id=%s", id);
        return;
      }
      if (object.name === "attrui") {
        object.receive(object.inlets[0], [value, time]);
      }
      // otherwise we run with that shit
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
      // this is a tick message so we will try to see if theres anything to send out
      const tick: TickMessage = parsedTick.output;

      if (!node.steps) {
        // schema has not been received yet so ignore
        return [];
      }

      const stepNumber = tick.stepNumber % node.steps.length;
      lastStepNumber = stepNumber;
      updateUI();

      if (node.steps[stepNumber].on) {
        handleParameterLocks(node.steps[stepNumber].parameterLocks, tick.time);
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
        node.attributes.length = node.steps.length;
        updateUI();

        return [];
      }
    }

    return [];
  };
};
