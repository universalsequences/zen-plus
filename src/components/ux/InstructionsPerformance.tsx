import React, { useEffect, useState, useRef } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { useValue } from "@/contexts/ValueContext";
import { ValueProvider } from "@/contexts/ValueContext";
import { useWorker } from "@/contexts/WorkerContext";

// Performance monitor for instructions per second
export const InstructionsPerformance: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  return (
    <ValueProvider node={objectNode}>
      <InstructionsPerformanceInner objectNode={objectNode} />
    </ValueProvider>
  );
};

const InstructionsPerformanceInner: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  usePosition();
  const { value: v } = useValue();
  const [value, setValue] = useState<number>(0);
  const worker = useWorker();
  
  // Tracking for rate calculation
  const prevInstructionCount = useRef(0);
  const prevTimestamp = useRef(Date.now());

  // Set up styles based on object node attributes
  const size = objectNode.size || { width: 120, height: 40 };
  const { width, height } = size;
  const textColor = objectNode.attributes.textColor as string || "#ffffff";
  const backgroundColor = objectNode.attributes.backgroundColor as string || "#000000";

  // Update performance metrics every second
  useEffect(() => {
    const updateInterval = 1000; // Update every 1 second
    
    const updateMetrics = () => {
      try {
        if (worker && typeof worker.getPerformanceMetrics === 'function') {
          const metrics = worker.getPerformanceMetrics();
          
          if (metrics) {
            // Calculate instructions per second
            const now = Date.now();
            const elapsedSeconds = (now - prevTimestamp.current) / 1000;
            
            // Avoid division by zero
            if (elapsedSeconds > 0) {
              const instructionsPerSecond = Math.round(
                (metrics.instructionCount - prevInstructionCount.current) / elapsedSeconds
              );
              
              // Update the UI and store in the object node's custom value
              setValue(instructionsPerSecond);
              if (objectNode.custom) {
                objectNode.custom.value = instructionsPerSecond;
              }
              
              // Save current values for next calculation
              prevInstructionCount.current = metrics.instructionCount;
              prevTimestamp.current = now;
            }
          }
        }
      } catch (error) {
        console.error('Error updating instruction performance:', error);
      }
    };
    
    // Run once immediately
    updateMetrics();
    
    // Set interval for updates
    const intervalId = setInterval(updateMetrics, updateInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [worker, objectNode.custom]);

  // Format large numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width,
        height,
        backgroundColor,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: "4px",
        fontFamily: "monospace",
        userSelect: "none",
      }}
    >
      <div>
        <span style={{ fontSize: Math.min(height * 0.5, width * 0.1) + "px" }}>
          {formatNumber(value)}
        </span>
        <span style={{ fontSize: Math.min(height * 0.3, width * 0.06) + "px", opacity: 0.7 }}>
          {" instr/s"}
        </span>
      </div>
    </div>
  );
};