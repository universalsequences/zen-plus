import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { ValueProvider, useValue } from "@/contexts/ValueContext";
import { useInterval } from "@/hooks/useInterval";
import type { ObjectNode } from "@/lib/nodes/types";
import { TriangleLeftIcon } from "@radix-ui/react-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SMOOTHING_FACTOR = 0.8; // Adjust this value to change the meter's responsiveness
const SCALE_FACTOR = 2.5;
const PEAK_HOLD_TIME = 1000; // Time in ms to hold peak before falling
const PEAK_FALL_RATE = 0.05; // How fast the peak markers fall

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

  const normalizedLevel = useRef(0);
  const leftLevel = useRef(0);
  const rightLevel = useRef(0);
  const leftPeak = useRef(0);
  const rightPeak = useRef(0);
  const leftPeakTime = useRef(0);
  const rightPeakTime = useRef(0);

  const getRMS = (data: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  };

  const normalizeLoudness = (rms: number) => {
    const db = 20 * Math.log10(rms);
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
    return normalized ** SCALE_FACTOR;
  };

  const updatePeaks = useCallback((leftLevel: number, rightLevel: number, now: number) => {
    // Update left peak
    if (leftLevel > leftPeak.current) {
      leftPeak.current = leftLevel;
      leftPeakTime.current = now;
    } else if (now - leftPeakTime.current > PEAK_HOLD_TIME) {
      leftPeak.current = Math.max(leftLevel, leftPeak.current - PEAK_FALL_RATE);
    }

    // Update right peak
    if (rightLevel > rightPeak.current) {
      rightPeak.current = rightLevel;
      rightPeakTime.current = now;
    } else if (now - rightPeakTime.current > PEAK_HOLD_TIME) {
      rightPeak.current = Math.max(rightLevel, rightPeak.current - PEAK_FALL_RATE);
    }
  }, []);

  const onTick = useCallback(() => {
    if (objectNode.auxAudioNodes) {
      const a = objectNode.auxAudioNodes[0] as AnalyserNode;
      const b = objectNode.auxAudioNodes[1] as AnalyserNode;
      a.getFloatTimeDomainData(dataLeft.current);
      b.getFloatTimeDomainData(dataRight.current);

      const rmsA = getRMS(dataLeft.current);
      const rmsB = getRMS(dataRight.current);

      const normalizedLoudnessA = normalizeLoudness(rmsA);
      const normalizedLoudnessB = normalizeLoudness(rmsB);

      normalizedLevel.current = normalizedLoudnessA;

      // Apply smoothing
      leftLevel.current =
        leftLevel.current * SMOOTHING_FACTOR + normalizedLoudnessA * (1 - SMOOTHING_FACTOR);
      rightLevel.current =
        rightLevel.current * SMOOTHING_FACTOR + normalizedLoudnessB * (1 - SMOOTHING_FACTOR);

      console.log("normalizedLoudnessA", normalizedLoudnessA);
      updatePeaks(leftLevel.current, rightLevel.current, Date.now());

      if (refLeft.current) {
        refLeft.current.style.height = `${leftLevel.current * 200}%`;
        refLeft.current.style.backgroundColor = getMeterColor(normalizedLevel.current * 1.2);
      }
      if (refRight.current) {
        refRight.current.style.height = `${rightLevel.current * 200}%`;
        refRight.current.style.backgroundColor = getMeterColor(normalizedLevel.current * 1.2);
      }
    }
  }, [objectNode.auxAudioNodes, updatePeaks]);

  useInterval(onTick, 60);

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
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = containerRef.current.offsetHeight;
      const yy = h - y + 0;
      const yyy = Math.max(0, Math.min(1, yy / h));
      console.log("yyy", yyy);
      setValue(yyy);

      if (objectNode.fn && !Number.isNaN(yyy)) {
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

  const size = objectNode.size || { width: 20, height: 200 };
  const { width, height } = size;

  // Generate decibel markers
  const dbMarkers = [-60, -50, -40, -30, -20, -10, -3, 0];

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      style={{ width: width, height }}
      className="flex flex-col relative"
    >
      <div className="flex w-full h-full">
        <div
          onMouseDown={onMouseDown}
          ref={containerRef}
          className="w-5 h-full bg-zinc-950 relative"
        >
          <div
            style={{ bottom: `${value * 100}%` }}
            className="translate-y-3 absolute w-10 h-10 -right-4 flex z-10"
          >
            <TriangleLeftIcon
              color={isDown ? "lime" : "white"}
              className="w-6 h-6 mt-auto mr-1 ml-auto"
            />
          </div>
          <div className="absolute top-0 right-0 w-5 h-full overflow-hidden">
            {/* Peak markers */}
            <div
              style={{ bottom: `${leftPeak.current * 200}%` }}
              className="absolute left-0 w-2 h-0.5 bg-red-500 z-20"
            />
            <div
              style={{ bottom: `${rightPeak.current * 200}%` }}
              className="absolute right-0 w-2 h-0.5 bg-red-500 z-20"
            />
            <div ref={refLeft} className="absolute bottom-0 left-0 w-2" />
            <div ref={refRight} className="absolute bottom-0 right-0 w-2" />
          </div>
        </div>
        {/* dB scale */}
        <div className="relative ml-1 w-6 h-full text-[8px] text-zinc-400">
          {dbMarkers.map((db) => {
            const normalizedHeight = (db + 60) / 60;
            return (
              <div
                key={db}
                style={{ bottom: `${normalizedHeight * 100}%` }}
                className="absolute -translate-y-1/2 flex items-center"
              >
                <div className="w-1 h-px bg-zinc-700 mr-1" />
                <span>{db}</span>
              </div>
            );
          })}
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
function normalizeDecibel(dBValue: number, dBMin = -100, dBMax = 0) {
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
    const ratio = normalizedValue / 100;
    color = interpolateColor(startColor, middleColor, ratio);
  } else {
    // Interpolate between middleColor and endColor
    const ratio = (normalizedValue - 0.5) / 0.5;
    color = interpolateColor(middleColor, endColor, ratio);
  }

  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function interpolateColor(
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
