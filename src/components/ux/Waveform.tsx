import React, { useEffect, useState } from "react";
import { useValue } from "@/contexts/ValueContext";
import type { ObjectNode } from "@/lib/nodes/types";
import ShaderWaveform from "../waveform/ShaderWaveform";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { hashFloat32Array } from "@/utils/waveform/hashFloat32Array";

export const Waveform = ({ objectNode }: { objectNode: ObjectNode }) => {
  const { value: myValue } = useValue();
  const value = objectNode.buffer || myValue;
  const selection = useSelection();
  const playhead = (objectNode.attributes.playhead || 0) as number;
  const { sizeIndex } = usePosition();
  const { width, height } = objectNode.size || { width: 300, height: 100 };

  const [key, setKey] = useState("");
  useEffect(() => {
    if (value) {
      setKey(
        `${hashFloat32Array(value as Float32Array).toString()}_${height}_${width}`,
      );
    }
  }, [value, width, height]);

  return (
    <div style={{ width, height }}>
      {value && (
        <ShaderWaveform
          zoomLevel={1}
          width={width}
          height={height}
          audioSamples={value as Float32Array}
          color={[1, 0, 0, 1]}
          waveformKey={key}
        />
      )}
      <div
        style={{ backgroundColor: "#ffffff1f", width: `${100 * playhead}%` }}
        className="h-full absolute z-30  top-0 left-0"
      />
    </div>
  );
};
