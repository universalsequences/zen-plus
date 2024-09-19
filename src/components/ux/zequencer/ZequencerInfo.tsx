import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { useStepsContext } from "@/contexts/StepsContext";
import { usePosition } from "@/contexts/PositionContext";
import { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import { useValue } from "@/contexts/ValueContext";
import NumberBox from "../NumberBox";
import { useLocked } from "@/contexts/LockedContext";
import { getRootPatch } from "@/lib/nodes/traverse";

interface PLockValue {
  name: string;
  value: number;
  node: ObjectNode;
}

export const ZequencerInfo: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { selectedSteps } = useStepsContext();
  const { presentationMode } = usePosition();
  const size = objectNode.size || { width: 300, height: 300 };
  const { setNodeToWatch } = useValue();

  const zequencer = useMemo(() => {
    return objectNode.patch.objectNodes.find((x) => x.name === "zequencer.core");
  }, [objectNode]);

  useEffect(() => {
    if (zequencer) {
      // this zequencer.info node is concerned with a zequencer.core node
      // so we must watch it for changes in step values
      setNodeToWatch(zequencer);
      setTimeout(() => {
        if (zequencer) {
          setNodeToWatch(zequencer);
        }
      }, 500);
    }
  }, [zequencer, setNodeToWatch, presentationMode]);

  const schema = zequencer?.stepsSchema || [];

  const nodes = getRootPatch(objectNode.patch).getAllNodes();
  const pLocks =
    selectedSteps
      ?.flatMap((step) => step.parameterLocks)
      .reduce(
        (acc, curr) => {
          const node = nodes.find((x) => x.id === curr.id);
          if (!node) {
            return acc;
          }
          acc[curr.id] = {
            name: node.text as string,
            value: curr.value,
            node,
          };
          return acc;
        },
        {} as Record<string, PLockValue>,
      ) || ({} as Record<string, PLockValue>);
  return (
    <div style={{ minWidth: 50, minHeight: 50 }} className="text-white bg-zinc-900">
      {zequencer &&
        selectedSteps &&
        selectedSteps[0] &&
        schema.map((field) => <SchemaField node={zequencer} steps={selectedSteps} field={field} />)}
      {zequencer &&
        selectedSteps &&
        selectedSteps[0] &&
        Object.values(pLocks).map((plockValue) => (
          <SchemaField
            key={plockValue.id}
            node={zequencer}
            steps={selectedSteps}
            plockValue={plockValue}
          />
        ))}
      <div style={{ fontSize: 8 }} className="flex gap-1">
        {selectedSteps?.slice(0, 1).map((x) => (
          <span className="px-1 bg-zinc-800 px-1  rounded-full">step {x.stepNumber + 1}</span>
        ))}
      </div>
    </div>
  );
};

type Props =
  | {
      field: StepDataSchema[0];
      plockValue?: never;
      steps: GenericStepData[];
      node: ObjectNode;
    }
  | {
      field?: never;
      plockValue: PLockValue;
      steps: GenericStepData[];
      node: ObjectNode;
    };

const SchemaField = (props: Props) => {
  const { lockedMode } = useLocked();
  const lockedModeRef = useRef(lockedMode);
  const { field, steps, plockValue } = props;
  const [update, setUpdate] = useState(0);
  const value = (plockValue ? plockValue.value : steps[0][field.name] || field.default) as number;

  const onChange = useCallback(
    (v: number) => {
      for (const step of props.steps) {
        const stepNumber = step.stepNumber;

        if (plockValue) {
          for (const step of steps) {
            const { node } = plockValue;
            const existingLock = step.parameterLocks.find((x) => x.id === node.id);
            if (existingLock) {
              existingLock.value = v;
            } else {
              step.parameterLocks.push({
                id: node.id,
                value: v,
              });
            }
            plockValue.value = v;
            setUpdate((prev) => prev + 1);
          }
        } else {
          props.node.receive(props.node.inlets[0], {
            stepNumber,
            name: props.field.name,
            value: v,
          });
        }
      }
    },
    [plockValue, props.steps, props.field, props.node, steps],
  );

  const paramNode = plockValue?.node?.controllingParamNode;
  return (
    <div className="flex ">
      <div className="w-16">
        {plockValue ? (plockValue.node.arguments[0] as string) : field.name}
      </div>
      <NumberBox
        isSelected={false}
        min={(paramNode?.attributes.min as number) || field?.min || 0}
        max={(paramNode?.attributes.max as number) || field?.max || 1}
        round={false}
        setValue={onChange}
        value={value}
        lockedModeRef={lockedModeRef}
      />
    </div>
  );
};
