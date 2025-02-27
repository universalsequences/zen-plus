import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { ValueProvider, useValue } from "@/contexts/ValueContext";
import type { ObjectNode } from "@/lib/nodes/types";
import { TriangleLeftIcon } from "@radix-ui/react-icons";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";

// Performance tuned constants
const SMOOTHING_FACTOR = 0.8; // Smoothing factor for meter movement
const SCALE_FACTOR = 2.5; // Visual scaling of meter values
const PEAK_HOLD_TIME = 800; // Reduced from 1000ms to 800ms
const PEAK_FALL_RATE = 0.05; // How fast peak markers fall
const UPDATE_INTERVAL = 100; // Increased from 80ms to 100ms for better performance

// Precomputed colors for performance
const METER_COLORS = {
  LOW: "rgb(0, 255, 0)",      // Green for low levels
  MID: "rgb(255, 255, 0)",    // Yellow for mid levels
  HIGH: "rgb(255, 0, 0)",     // Red for high levels
  PEAK: "rgb(255, 0, 0)"      // Red for peak indicators
};

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
  useSelection();
  
  // Memoize size calculations
  const size = objectNode.size || { width: 20, height: 200 };
  const { width, height } = size;
  
  // Pre-compute DB markers to avoid recomputation on each render
  const dbMarkers = useMemo(() => {
    return height < 100 ? [-50, -40, -20, -30, -10, 0] : [-50, -40, -30, -20, -10, -3, 0];
  }, [height]);

  // Sync with custom value changes
  useEffect(() => {
    setValue(custom.value as number);
  }, [custom.value]);

  // DOM refs
  const containerRef = useRef<HTMLDivElement>(null);
  const refLeft = useRef<HTMLDivElement>(null);
  const refRight = useRef<HTMLDivElement>(null);
  const refLeftPeak = useRef<HTMLDivElement>(null);
  const refRightPeak = useRef<HTMLDivElement>(null);
  
  // Audio data refs
  const dataLeft = useRef(new Float32Array(32)); // Reduced buffer size
  const dataRight = useRef(new Float32Array(32));

  // Meter state refs
  const leftLevel = useRef(0);
  const rightLevel = useRef(0);
  const leftPeak = useRef(0);
  const rightPeak = useRef(0);
  const leftPeakTime = useRef(0);
  const rightPeakTime = useRef(0);
  
  // User interaction state
  const [isDown, setIsDown] = useState(false);
  const down = useRef(false);
  const lastUpdateTimeRef = useRef(0);

  // Calculate RMS (root mean square) of audio data
  const getRMS = (data: Float32Array) => {
    let sum = 0;
    const len = data.length;
    // Using a step of 2 for faster computation with minimal quality loss
    for (let i = 0; i < len; i += 2) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / (len / 2));
  };

  // Convert RMS to normalized loudness value
  const normalizeLoudness = (rms: number) => {
    const db = 20 * Math.log10(rms);
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
    return normalized ** SCALE_FACTOR;
  };

  // Get meter color based on level
  const getMeterColor = (level: number): string => {
    if (level > 0.8) return METER_COLORS.HIGH; 
    if (level > 0.5) return METER_COLORS.MID;
    return METER_COLORS.LOW;
  };

  // Update peak marker positions
  const updatePeaks = useCallback((leftLevel: number, rightLevel: number, now: number) => {
    // Update peaks and track peak times
    if (leftLevel > leftPeak.current) {
      leftPeak.current = leftLevel;
      leftPeakTime.current = now;
    } else if (now - leftPeakTime.current > PEAK_HOLD_TIME) {
      leftPeak.current = Math.max(leftLevel, leftPeak.current - PEAK_FALL_RATE);
    }

    if (rightLevel > rightPeak.current) {
      rightPeak.current = rightLevel;
      rightPeakTime.current = now;
    } else if (now - rightPeakTime.current > PEAK_HOLD_TIME) {
      rightPeak.current = Math.max(rightLevel, rightPeak.current - PEAK_FALL_RATE);
    }

    // Only update DOM when references exist
    if (refLeftPeak.current) {
      refLeftPeak.current.style.bottom = `${leftPeak.current * 200}%`;
    }
    if (refRightPeak.current) {
      refRightPeak.current.style.bottom = `${rightPeak.current * 200}%`;
    }
  }, []);

  // Core meter update function - optimized for performance
  const updateMeter = useCallback(() => {
    const now = performance.now();
    
    // Throttle updates to the specified interval
    if (now - lastUpdateTimeRef.current < UPDATE_INTERVAL) {
      return;
    }
    lastUpdateTimeRef.current = now;
    
    // Only process if audio nodes exist
    if (objectNode.auxAudioNodes) {
      const a = objectNode.auxAudioNodes[0] as AnalyserNode;
      const b = objectNode.auxAudioNodes[1] as AnalyserNode;
      
      // Get audio data
      a.getFloatTimeDomainData(dataLeft.current);
      b.getFloatTimeDomainData(dataRight.current);

      // Calculate levels with reduced compute
      const rmsA = getRMS(dataLeft.current);
      const rmsB = getRMS(dataRight.current);
      const normalizedLoudnessA = normalizeLoudness(rmsA);
      const normalizedLoudnessB = normalizeLoudness(rmsB);

      // Apply smoothing for more stable UI
      leftLevel.current = leftLevel.current * SMOOTHING_FACTOR + normalizedLoudnessA * (1 - SMOOTHING_FACTOR);
      rightLevel.current = rightLevel.current * SMOOTHING_FACTOR + normalizedLoudnessB * (1 - SMOOTHING_FACTOR);

      // Update peaks
      updatePeaks(leftLevel.current, rightLevel.current, now);

      // Update DOM - direct style manipulation for performance
      if (refLeft.current) {
        refLeft.current.style.height = `${leftLevel.current * 200}%`;
        refLeft.current.style.backgroundColor = getMeterColor(leftLevel.current);
      }
      if (refRight.current) {
        refRight.current.style.height = `${rightLevel.current * 200}%`;
        refRight.current.style.backgroundColor = getMeterColor(rightLevel.current);
      }
    }
  }, [objectNode.auxAudioNodes, updatePeaks]);

  // Use requestAnimationFrame for smoother updates than setInterval
  useEffect(() => {
    let animationFrameId: number;
    
    const updateLoop = () => {
      updateMeter();
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [updateMeter]);

  // Mouse interaction handlers
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
      
      // Get position data
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = containerRef.current.offsetHeight;
      
      // Calculate normalized value (0-1)
      const normalizedY = Math.max(0, Math.min(1, (h - y) / h));
      
      // Only update if value changed significantly (reduces updates)
      if (Math.abs(normalizedY - value) > 0.005) {
        setValue(normalizedY);
        
        // Send to object node function if valid
        if (objectNode.fn && !Number.isNaN(normalizedY)) {
          objectNode.fn(normalizedY);
        }
      }
    },
    [lockedMode, objectNode, value],
  );

  // Add and remove global event listeners
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // Memoize slider style
  const sliderStyle = useMemo(() => ({
    bottom: `${value * 100}%`
  }), [value]);

  // Memoize container style 
  const containerStyle = useMemo(() => ({
    width,
    height
  }), [width, height]);

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      style={containerStyle}
      className="flex flex-col"
    >
      <div className="flex w-full h-full relative">
        <div
          onMouseDown={onMouseDown}
          ref={containerRef}
          className="w-5 h-full bg-zinc-950 relative"
        >
          <div
            style={sliderStyle}
            className="translate-y-3 absolute w-10 h-10 -right-4 flex z-10"
          >
            <TriangleLeftIcon
              color={isDown ? "lime" : "white"}
              className="w-6 h-6 mt-auto mr-1 ml-auto"
            />
          </div>
          <div className="absolute top-0 right-0 w-5 h-full overflow-hidden">
            {/* Peak markers */}
            <div ref={refLeftPeak} className="absolute left-0 w-2 h-0.5 bg-red-500 z-20" />
            <div ref={refRightPeak} className="absolute right-0 w-2 h-0.5 bg-red-500 z-20" />
            <div ref={refLeft} className="absolute bottom-0 left-0 w-2" />
            <div ref={refRight} className="absolute bottom-0 right-0 w-2" />
          </div>
        </div>
        
        {/* dB scale - Only render if showMarkers is true */}
        {objectNode.attributes.showMarkers && (
          <div className="relative ml-1 w-6 h-full text-[8px] text-zinc-400">
            {dbMarkers.map((db) => {
              const normalizedHeight = (db + 60) / 60;
              return (
                <div
                  key={db}
                  style={{ top: `${5 + 100 - normalizedHeight * 100}%` }}
                  className="absolute -translate-y-1/2 flex items-center w-full"
                >
                  <div className="w-1 h-px bg-zinc-700 mr-1" />
                  <span className="ml-auto">{db}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};