import { useStepsContext } from "@/contexts/StepsContext";
import { FieldSchema, GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { ObjectNode } from "@/lib/nodes/types";
import { Dispatch, SetStateAction, useState, useCallback, useRef } from "react";
import { usePatches } from "../../../contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import { usePatchSelector } from "@/hooks/usePatchSelector";

interface Props {
  objectNode: ObjectNode;
  step: GenericStepData;
  parameter: string;
  fieldSchema: FieldSchema;
  color: string;
  mouseStartY: number | null;
  setMouseStartY: Dispatch<SetStateAction<number | null>>;
}

export const CirklonStep = (props: Props) => {
  const { setSelectedSteps } = useStepsContext();
  const { step, objectNode, parameter, fieldSchema, color } = props;
  const value = step[parameter] as number;
  const { min = 0, max = 1 } = fieldSchema;
  const ratio = Math.min(1, (value - min) / (max - min));
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const { selectPatch } = usePatchSelector();

  const update = useCallback(
    (value: number) => {
      objectNode.receive(objectNode.inlets[0], {
        name: parameter,
        value,
        stepNumber: step.stepNumber,
      });
    },
    [parameter, step],
  );

  const calculateValue = useCallback(
    (y: number) => {
      const h = ref.current?.offsetHeight as number;

      const value = min + ((h - y) / h) * (max - min);
      if (max - min > 6) {
        return Math.round(value);
      }
      return value;
    },
    [min, max],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      const y = e.clientY - (rect?.top as number);
      props.setMouseStartY(y);
      update(calculateValue(y));
      setSelectedSteps([step]);
      selectPatch();
    },
    [update, calculateValue, selectPatch],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (props.mouseStartY === null) {
        return;
      }
      const rect = ref.current?.getBoundingClientRect();
      const y = e.clientY - (rect?.top as number);
      update(calculateValue(y));
      setSelectedSteps([step]);
    },
    [update, calculateValue, props.mouseStartY],
  );

  return (
    <div
      className={`${step.on ? "" : "opacity-20 pointer-events-none"} w-full h-full relative  flex`}
    >
      <div
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        ref={ref}
        className="mx-0.5 flex relative  bg-zinc-800 flex-1"
      >
        <div
          style={{ bottom: `${ratio * 100}%`, backgroundColor: color }}
          className="h-0.5  w-full flex-1 absolute"
        />
        {hovering && (
          <div
            style={{ fontSize: 8 }}
            className="absolute top-0 bottom-0 my-auto text-xs text-white table w-full text-center"
          >
            {Math.round(100 * value) / 100}
          </div>
        )}
      </div>
    </div>
  );
};
