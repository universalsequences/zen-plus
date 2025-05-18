import React, { useRef, useState, useEffect } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";

interface AttrUISliderProps {
  value: number;
  setValue: (num: number, e?: MouseEvent) => void;
  min: number;
  max: number;
  node: ObjectNode;
  lockedModeRef: React.MutableRefObject<boolean>;
  orientation: "horizontal" | "vertical";
}

const AttrUISlider: React.FC<AttrUISliderProps> = ({
  value,
  setValue,
  min,
  max,
  node,
  lockedModeRef,
  orientation,
}) => {
  useSelection();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 100, height: 100 });

  // Normalize value between 0 and 1 for display
  const normalizedValue = (value - min) / (max - min);

  // Format value for display (round to 2 decimal places)
  const displayValue = Math.round(value * 100) / 100;

  // Get color from parent attrui node attribute, or fallback to fillColor or default blue
  const sliderColor = node.attributes.color || node.attributes.fillColor || "#3b82f6";

  // Get the actual dimensions from the DOM on mount and resize
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          setDimensions({
            width: clientWidth,
            height: clientHeight,
          });
        }
      };

      // Initial measurement
      updateDimensions();

      // Setup resize observer to handle container size changes
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
        resizeObserver.disconnect();
      };
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (lockedModeRef.current) {
      e.stopPropagation();
      setEditing(true);
      handleMouseMove(e); // Set initial position
    }
  };

  const handleMouseMove = (e: MouseEvent | React.MouseEvent) => {
    if (editing && containerRef.current) {
      const sliderRect = containerRef.current.getBoundingClientRect();
      let newNormalizedValue;

      if (orientation === "vertical") {
        // Vertical slider: 0 at bottom, 1 at top
        newNormalizedValue =
          1 - Math.min(Math.max(0, (e.clientY - sliderRect.top) / sliderRect.height), 1);
      } else {
        // Horizontal slider: 0 at left, 1 at right
        newNormalizedValue = Math.min(
          Math.max(0, (e.clientX - sliderRect.left) / sliderRect.width),
          1,
        );
      }

      // Convert back to range and update
      const rangeValue = min + newNormalizedValue * (max - min);
      setValue(rangeValue, e as MouseEvent);
    }
  };

  const handleMouseUp = () => {
    setEditing(false);
  };

  useEffect(() => {
    if (editing) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editing]);

  // For vertical orientation, the fill is from bottom to top
  // For horizontal orientation, the fill is from left to right
  const style =
    orientation === "vertical"
      ? {
          width: "100%",
          height: `${normalizedValue * 100}%`,
          position: "absolute",
          bottom: 0,
          backgroundColor: sliderColor as string,
        }
      : {
          width: `${normalizedValue * 100}%`,
          height: "100%",
          position: "absolute",
          left: 0,
          backgroundColor: sliderColor as string,
        };

  // Determine if we should show the value indicator based on size
  const smallestDimension = Math.min(dimensions.width, dimensions.height);
  const showValueIndicator = editing && smallestDimension > 8;

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: "#1b1a1a",
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: "3px",
        minHeight: "3px",
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={style as React.CSSProperties}></div>

      {/* Value indicator overlay when editing - only show if we have enough space */}
      {showValueIndicator && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 10,
            color: "white",
            fontFamily: "monospace",
            fontSize: smallestDimension < 20 ? "8px" : "0.8rem",
            textShadow: "1px 1px 1px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
};

export default AttrUISlider;
