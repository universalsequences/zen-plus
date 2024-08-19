import { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import { ObjectNode } from "@/lib/nodes/types";
import { CirklonStep } from "./CirklonStep";
import { Dispatch, SetStateAction } from "react";

interface Props {
  steps: GenericStepData[];
  objectNode: ObjectNode;
  schema: StepDataSchema;
  parameter: string;
  color: string;
  mouseStartY: number | null;
  setMouseStartY: Dispatch<SetStateAction<number | null>>;
}

export const Cirklon = (props: Props) => {
  const { steps, color, objectNode, mouseStartY, setMouseStartY, schema, parameter } = props;
  const fieldSchema = schema.find((x) => x.name === parameter);
  if (!fieldSchema) {
    return <></>;
  }
  return (
    <div className="flex h-full">
      {steps.map((step) => (
        <CirklonStep
          objectNode={objectNode}
          setMouseStartY={setMouseStartY}
          mouseStartY={mouseStartY}
          color={color}
          fieldSchema={fieldSchema}
          step={step}
          parameter={parameter}
        />
      ))}
    </div>
  );
};
