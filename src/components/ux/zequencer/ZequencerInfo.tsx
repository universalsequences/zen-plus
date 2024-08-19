import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { useStepsContext } from "@/contexts/StepsContext";
import { usePosition } from "@/contexts/PositionContext";
import { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import { useValue } from "@/contexts/ValueContext";
import NumberBox from "../NumberBox";
import { useLocked } from "@/contexts/LockedContext";

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

  return (
      <div style={{minWidth: 50, minHeight: 50}} className="text-white bg-zinc-900">
      {zequencer &&
        selectedSteps &&
        selectedSteps[0] &&
        schema.map((field) => <SchemaField node={zequencer} steps={selectedSteps} field={field} />)}
      <div style={{ fontSize: 8 }} className="flex gap-1">
        {selectedSteps?.map((x) => (
          <span className="px-1 bg-zinc-800 px-1  rounded-full">step {x.stepNumber + 1}</span>
        ))}
      </div>
    </div>
  );
};

interface Props {
  field: StepDataSchema[0];
  steps: GenericStepData[];
  node: ObjectNode;
}

const SchemaField = (props: Props) => {
  const { lockedMode } = useLocked();
  const lockedModeRef = useRef(lockedMode);
  const { field, steps } = props;
  const value = (steps[0][field.name] || field.default) as number;

  const onChange = useCallback(
    (v: number) => {
      for (const step of props.steps) {
        const stepNumber = step.stepNumber;

        props.node.receive(props.node.inlets[0], {
          stepNumber,
          name: props.field.name,
          value: v,
        });
      }
    },
    [props.steps, props.field, props.node],
  );

  return (
    <div className="flex ">
      <div className="w-16">{field.name}</div>
      <NumberBox
        isSelected={false}
        min={field.min || 0}
        max={field.max || 1}
        round={false}
        setValue={onChange}
        value={value}
        lockedModeRef={lockedModeRef}
      />
    </div>
  );
};
