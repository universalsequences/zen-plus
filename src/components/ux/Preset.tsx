import React, { useEffect, useState, useRef, useCallback } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset";
import MatrixCell from "./MatrixCell";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";

const PresetUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let ref = useRef<HTMLDivElement>(null);
  const { sizeIndex } = usePosition();
  let { width, height } = sizeIndex[objectNode.id] || { width: 100, height: 100 };
  let mgmt = objectNode.custom as any as PresetManager;
  let [current, setCurrent] = useState(mgmt.currentPreset);

    useEffect(() => {
        setCurrent(mgmt.currentPreset);
    }, [mgmt])

  const switchToPreset = useCallback(
    (i: number) => {
      mgmt.switchToPreset(i);
      setCurrent(i);
    },
    [setCurrent, mgmt],
  );

  return (
    <div
      style={{ width, height }}
      className="flex flex-wrap overflow-hidden content-start bg-zinc-950"
    >
      {mgmt.presets.map((preset, i) => (
        <div
          key={i}
          onClick={() => switchToPreset(i)}
          className={
            "w-3 h-3 m-0.5 cursor-pointer transition-colors " +
            (current === i
              ? "bg-zinc-100 "
              : Object.keys(mgmt.presets[i]).length === 0
                ? "bg-zinc-900"
                : "bg-zinc-400")
          }
        ></div>
      ))}
    </div>
  );
};

export default PresetUI;
