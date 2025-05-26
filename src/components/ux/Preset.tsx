import React, { useEffect, useState } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset/manager";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";
import PresetBase from "./PresetBase";

const PresetUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let mgmt = objectNode.custom as any as PresetManager;
  let [current, setCurrent] = useState(mgmt.currentPreset);

  const { value } = useValue();

  useEffect(() => {
    if (Array.isArray(value)) {
      setCurrent(value[0] as number);
    }
  }, [value]);

  return (
    <PresetBase objectNode={objectNode} presetManager={mgmt} currentSlot={current} value={value} />
  );
};

export default PresetUI;
