import type { AttributeValue, Message, MessageObject, ObjectNode } from "@/lib/nodes/types";
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
import { getDefaultStep, setupSchema } from "./setupSchema";
import { handleOperation } from "./operation";
import { getRootPatch } from "@/lib/nodes/traverse";

doc("zequencer.core", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "A sequencer that can be controlled by messages.",
});

export const zequencer = <Schemas extends readonly FieldSchema[]>(node: ObjectNode) => {
  node.branching = true;
  node.needsUX = true;
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

      if (node.onNewStepSchema && node.stepsSchema) {
        node.onNewStepSchema(node.stepsSchema);
      }
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

  const updateUI = (onlyStepNumber = false) => {
    if (node.onNewValues && node.steps) {
      for (const id in node.onNewValues) {
        node.onNewValues[id]([lastStepNumber]);
      }
    }

    if (node.steps && !onlyStepNumber) {
      (node.custom as MutableValue).value = node.steps.map((voiceArray) =>
        voiceArray.map((voice) => ({ ...voice })),
      ) as Message[];
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

  type NoteOn = {
    type: "noteon";
  } & {
    [x: string]: number;
  };
  type NoteOff = {
    type: "noteoff";
  } & {
    [x: string]: number;
  };

  let recordingNoteOn: {
    [semitone: number]: number;
  } = {};

  const handleNoteOn = (noteon: NoteOn) => {
    const stepData = node.steps?.[0][0];
    if (stepData) {
      for (const key in noteon) {
        if (key in stepData && ["semitone", "transpose"].includes(key)) {
          // we have a match
          const num = noteon[key];
          recordingNoteOn[num] = lastStepNumber || 0;
        }
      }
    }
  };

  const handleNoteOff = (noteoff: NoteOff) => {
    const stepData = node.steps?.[0][0];
    if (stepData) {
      for (const key in noteoff) {
        if (key in stepData && ["semitone", "transpose"].includes(key)) {
          // we have a match
          const num = noteoff[key];
          const stepNumber = recordingNoteOn[num];
          const duration = Math.max(1, lastStepNumber - stepNumber);
          if (node.stepsSchema) {
            // Create a new step with the recorded note
            const newStepData = getDefaultStep(stepNumber, node.stepsSchema);
            newStepData[key] = num;
            newStepData.on = true;
            newStepData["duration"] = duration;

            // If there are existing steps at this position
            if (node.steps && node.steps?.[stepNumber]?.length > 0) {
              // Only replace the default step if it's the only step and it's turned off
              if (node.steps[stepNumber].length === 1 && !node.steps[stepNumber][0].on) {
                node.steps[stepNumber] = [newStepData];
              } else {
                // Otherwise add the new step, preserving existing steps
                node.steps?.[stepNumber].push(newStepData);
              }
            } else {
              // No steps at this position, add a new one
              if (node.steps) {
                node.steps[stepNumber] = [newStepData];
              }
            }
          }
          updateUI();
        }
      }
    }
  };

  return (message: Message) => {
    if (message === "clear" && node.stepsSchema) {
      node.steps = setupSchema(node.stepsSchema, [], node.attributes.length as number);
      updateUI();
      return [];
    }
    // handle recording
    if (typeof message === "object" && (message as MessageObject).type === "noteon") {
      handleNoteOn(message as NoteOn);
      return [];
    } else if (typeof message === "object" && (message as MessageObject).type === "noteoff") {
      handleNoteOff(message as NoteOff);
      return [];
    }

    if (Array.isArray(message) && node.steps) {
      // Handle receiving an array of steps
      // This now expects a nested array structure for polyphonic data
      if (Array.isArray(message[0])) {
        // This is already in the correct format (array of arrays of GenericStepData)
        node.steps = message as GenericStepData[][];
        updateUI();
        return [];
      }
    }

    // schema will come in the form of an object
    // so operation: ["schema", [{name: "transpose", min: 0, max: 12, default: 0}]
    const parsedSchema = v.safeParse(StepSchema, message);
    if (parsedSchema.success) {
      schema = parsedSchema.output;
      const length =
        node.steps?.length !== 16 ? node.steps?.length || 16 : (node.attributes.length as number);
      node.steps = setupSchema(schema, node.steps || [], length);
      node.stepsSchema = schema;
      updateUI();
      if (node.onNewStepSchema && node.stepsSchema) {
        node.onNewStepSchema(node.stepsSchema);
      }
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
      updateUI(true);

      const stepVoices = node.steps[stepNumber];
      if (!stepVoices || stepVoices.length === 0) {
        return [];
      }

      // Check if any of the voices at this step are on
      const activeVoices = stepVoices.filter((voice) => voice.on);

      if (activeVoices.length > 0) {
        // Process all active voices at this step
        const results = activeVoices.map((voice) => {
          // Process parameter locks for this voice
          handleParameterLocks(voice.parameterLocks, tick.time);

          // Return the step data with time
          return {
            time: tick.time,
            ...voice,
          };
        });

        return [results];
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

        if (node.custom && node.steps) {
          // Update the custom value to contain the full polyphonic steps data
          node.custom.value = node.steps.map((voiceArray) =>
            voiceArray.map((voice) => ({ ...voice })),
          ) as Message[];

          // Only send the current step number to the UI
          (node.custom as MutableValue).updateMainThread([
            { nodeId: node.id, value: [lastStepNumber] },
          ]);
        }

        return [];
      }
    }

    return [];
  };
};
