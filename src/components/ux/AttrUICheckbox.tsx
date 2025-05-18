import React, { useRef, useEffect, useState } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { useSelection } from "@/contexts/SelectionContext";

interface AttrUICheckboxProps {
  value: number;
  setValue: (num: number, e?: MouseEvent) => void;
  min: number;
  max: number;
  node: ObjectNode;
  lockedModeRef: React.MutableRefObject<boolean>;
}

const AttrUICheckbox: React.FC<AttrUICheckboxProps> = ({
  value,
  setValue,
  min = 0,
  max = 1,
  node,
  lockedModeRef,
}) => {
  useSelection();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 20, height: 20 });
  const [isEditingValue, setIsEditingValue] = useState(false);

  // Use default values if min or max are undefined
  const effectiveMin = min ?? 0;
  const effectiveMax = max ?? 1;

  // Checkbox treats values closer to max as checked, closer to min as unchecked
  const midpoint = effectiveMin + (effectiveMax - effectiveMin) / 2;
  const isChecked = value >= midpoint;

  // Display value (for the indicator)
  const displayValue = isChecked ? effectiveMax.toString() : effectiveMin.toString();

  // Get color from parent attrui node attribute, or fallback to fillColor or default blue
  const checkboxColor = node.attributes.color || node.attributes.fillColor || "#3b82f6";

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

  const handleClick = (e: React.MouseEvent) => {
    if (lockedModeRef.current) {
      e.stopPropagation();

      // Start editing (show value)
      setIsEditingValue(true);

      // Toggle between min and max
      setValue(isChecked ? effectiveMin : effectiveMax, e as unknown as MouseEvent);

      // Hide value indicator after a short delay
      setTimeout(() => {
        setIsEditingValue(false);
      }, 500);
    }
  };

  // Use container dimensions to create a square checkbox
  const boxSize = Math.min(dimensions.width, dimensions.height);

  // Determine border width and inner box sizing based on available space
  const borderWidth = boxSize < 10 ? 1 : 1;
  const innerBoxScale = boxSize < 10 ? 0.7 : 0.6;

  // Don't show value indicator if checkbox is extremely small
  const showValueIndicator = isEditingValue && boxSize > 8;

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      <div
        style={{
          width: boxSize,
          height: boxSize,
          backgroundColor: "#1b1a1a",
          border: `${borderWidth}px solid #383838`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          position: "relative",
          minWidth: "3px",
          minHeight: "3px",
        }}
        onClick={handleClick}
      >
        {isChecked && (
          <div
            style={{
              width: boxSize * innerBoxScale,
              height: boxSize * innerBoxScale,
              backgroundColor: checkboxColor as string,
            }}
          />
        )}

        {/* Value indicator overlay when editing - only if big enough */}
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
              color: "white",
              fontFamily: "monospace",
              fontSize: boxSize < 15 ? "7px" : "0.8rem",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            {displayValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttrUICheckbox;
