import React, { useState, useCallback, useEffect } from "react";
import { useValue } from "@/contexts/ValueContext";
import NumberBox from "./NumberBox";
import { Message, ObjectNode } from "@/lib/nodes/types";
import { useStepsContext } from "@/contexts/StepsContext";

const AttrUIValue: React.FC<{
  lockedModeRef: React.MutableRefObject<boolean>;
  min: number;
  max: number;
  node: ObjectNode;
}> = ({ node, lockedModeRef, min, max }) => {
  const { selectedSteps } = useStepsContext();
  const parsed = parseFloat(node.text.split(" ")[2]);
  const [value, setValue] = useState(!Number.isNaN(parsed) ? parsed : 0);
  const onChangeValue = useCallback(
    (num: number, e?: MouseEvent) => {
      let objectNode = node;
      setValue(num);
      let text = objectNode.text.split(" ");
      text[2] = num.toString();
      objectNode.text = text.join(" ");
      objectNode.arguments[1] = num;
      objectNode.inlets[1].lastMessage = num;
      if (node && node.custom) {
        (node.custom as any).value = num;
      }
      if (node.instructions) {
        // need to actually send over the data and evaluate ...
        // do we need a special function for this
        node.patch.sendWorkerMessage?.({
          type: "attrui",
          body: {
            nodeId: node.id,
            message: num,
          },
        });
        return;
      }
      let message: Message = text.slice(1).join(" ");
      objectNode.send(objectNode.outlets[0], message);

      if (selectedSteps && e?.metaKey) {
        for (const step of selectedSteps) {
          const existingLock = step.parameterLocks.find((x) => x.id === node.id);
          if (existingLock) {
            existingLock.value = num;
          } else {
            step.parameterLocks.push({
              id: node.id,
              value: num,
            });
          }
        }
      }
    },
    [node, selectedSteps],
  );

  let { value: message } = useValue();
  useEffect(() => {
    if (message !== null) {
      setValue(message as number);
    }
  }, [message, setValue]);

  return React.useMemo(() => {
    return (
      <NumberBox
        className="bg-zinc-900"
        round={false}
        isSelected={true}
        value={value}
        setValue={onChangeValue}
        min={min}
        max={max}
        lockedModeRef={lockedModeRef}
      />
    );
  }, [value, max, min]);
};

export default AttrUIValue;
