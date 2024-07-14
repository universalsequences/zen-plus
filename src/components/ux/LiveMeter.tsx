import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { ValueProvider, useValue } from "@/contexts/ValueContext";
import { useInterval } from "@/hooks/useInterval";
import { ObjectNode } from "@/lib/nodes/types";
import { TriangleLeftIcon } from "@radix-ui/react-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";

export const LiveMeter: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  return (
    <ValueProvider node={objectNode}>
      <LiveMeterInner objectNode={objectNode} />
    </ValueProvider>
  );
};
const LiveMeterInner: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  usePosition();
  useValue();
  const { lockedMode } = useLocked();
  const custom = objectNode.custom!;
  const [value, setValue] = useState(custom.value as number);

  useEffect(() => {
    setValue(custom.value as number);
  }, [custom.value]);

  const refLeft = useRef<HTMLDivElement>(null);
  const refRight = useRef<HTMLDivElement>(null);
  const dataLeft = useRef(new Float32Array(128));
  const dataRight = useRef(new Float32Array(128));

  const onTick = useCallback(() => {
    if (objectNode.auxAudioNodes) {
      let a = objectNode.auxAudioNodes[0] as AnalyserNode;
      let b = objectNode.auxAudioNodes[1] as AnalyserNode;
      a.getFloatTimeDomainData(dataLeft.current);
      b.getFloatTimeDomainData(dataRight.current);
      const rmsA = getRMS(dataLeft.current);
      const normalizedLoudnessA = rmsA;
      const rmsB = getRMS(dataRight.current);
      const normalizedLoudnessB = rmsB;
      if (refLeft.current) {
        refLeft.current.style.height = `${normalizedLoudnessA * 100}%`;
      }
      if (refRight.current) {
        refRight.current.style.height = `${normalizedLoudnessB * 100}%`;
      }
    }
  }, [objectNode.auxAudioNodes]);

  useInterval(onTick, 30);

  const [isDown, setIsDown] = useState(false);
  const down = useRef(false);
  const onMouseDown = useCallback(() => {
    down.current = true;
    setIsDown(true);
  }, []);

  const onMouseUp = useCallback(() => {
    down.current = false;
    setIsDown(false);
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!lockedMode || !containerRef.current || !down.current) {
        return;
      }
      let rect = containerRef.current.getBoundingClientRect();
      let y = e.clientY - rect.top;
      let h = containerRef.current.offsetHeight;
      let yy = h - y - 10;
      let yyy = Math.max(0, Math.min(1, yy / h));
      setValue(yyy);

      if (objectNode.fn) {
        objectNode.fn(yyy);
      }
    },
    [lockedMode, objectNode],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  let size = objectNode.size || { width: 20, height: 200 };
  let { width, height } = size;

  return (
    <div style={{ width, height }} className="flex flex-col relative">
      <div onMouseDown={onMouseDown} ref={containerRef} className="w-5 h-full bg-zinc-600 relative">
        <div
          style={{ bottom: `${value * 100}%` }}
          className="translate-y-3 absolute w-10 h-10 -right-4 flex  z-10 "
        >
          <TriangleLeftIcon
            color={isDown ? "lime" : "white"}
            className=" w-6 h-6 mt-auto mr-1 ml-auto"
          />
        </div>
        <div className="absolute top-0 right-0 w-5 h-full overflow-hidden">
          <div
            ref={refLeft}
            style={{
              backgroundColor: getMeterColor(value),
            }}
            className="absolute bottom-0 left-0 w-2"
          ></div>
          <div
            ref={refRight}
            style={{
              backgroundColor: getMeterColor(value),
            }}
            className="absolute bottom-0 right-0 w-2"
          ></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Normalize a decibel value to a 0-1 range for a meter
 * @param dBValue - The decibel value to be normalized
 * @param dBMin - The minimum decibel value (e.g., -100 dB)
 * @param dBMax - The maximum decibel value (e.g., 0 dB)
 * @returns The normalized value between 0 and 1
 */
function normalizeDecibel(dBValue: number, dBMin: number = -100, dBMax: number = 0): number {
  if (dBMax === dBMin) {
    throw new Error("Decibel max and min values cannot be the same");
  }
  // Ensure the dB value is within the specified range
  const clampedValue = Math.max(dBMin, Math.min(dBMax, dBValue));
  return (clampedValue - dBMin) / (dBMax - dBMin);
}

function getMeterColor(normalizedValue: number): string {
  // Define the color gradient
  const startColor = { r: 0, g: 255, b: 0 }; // Green
  const middleColor = { r: 255, g: 255, b: 0 }; // Yellow
  const endColor = { r: 255, g: 0, b: 0 }; // Red

  let color;
  if (normalizedValue <= 0.5) {
    // Interpolate between startColor and middleColor
    const ratio = normalizedValue / 0.5;
    color = interpolateColor(startColor, middleColor, ratio);
  } else {
    // Interpolate between middleColor and endColor
    const ratio = (normalizedValue - 0.5) / 0.5;
    color = interpolateColor(middleColor, endColor, ratio);
  }

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function interpolateColor(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  ratio: number,
) {
  const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
  const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
  const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
  return { r, g, b };
}

function getRMS(dataArray: Float32Array) {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  return Math.sqrt(sum / dataArray.length);
}
