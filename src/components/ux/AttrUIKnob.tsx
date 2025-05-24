import React, { useRef, useEffect, useState } from "react";
import { ObjectNode } from "@/lib/nodes/types";
import { useMouseEditValue } from "@/hooks/useMouseEditValue";
import { useSelection } from "@/contexts/SelectionContext";

interface AttrUIKnobProps {
  value: number;
  setValue: (num: number, e?: MouseEvent) => void;
  min: number;
  max: number;
  node: ObjectNode;
  lockedModeRef: React.MutableRefObject<boolean>;
}

const AttrUIKnob: React.FC<AttrUIKnobProps> = ({
  value,
  setValue,
  min,
  max,
  node,
  lockedModeRef,
}) => {
  useSelection();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 100, height: 100 });
  const [isEditing, setIsEditing] = useState(false);
  // Get color from parent attrui node attribute, or fallback to strokeColor or default blue
  const knobColor = node.attributes.color || node.attributes.strokeColor || "#3b82f6";

  // Get exponent for non-linear mapping (power curve)
  const exponent = node.attributes.exponent !== undefined ? Number(node.attributes.exponent) : 1;
  
  // Apply inverse of the power function to convert back from value to normalized position
  // For values that had been previously transformed using the power function
  const getNormalizedFromValue = (val: number) => {
    const normalized = (val - min) / (max - min);
    return exponent === 1 
      ? normalized // Linear case
      : Math.pow(normalized, 1 / exponent); // Inverse power function
  };
  
  // Normalize value between 0 and 1 for the knob, using inverse mapping
  const normalizedValue = getNormalizedFromValue(value);

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

  // Format value for display (round to 2 decimal places)
  const displayValue = Math.round(value * 100) / 100;

  // Handle mouse interaction
  const handleValueChange = (newVal: number, e?: MouseEvent) => {
    // Apply power function to the normalized value for non-linear mapping
    const mappedNormalizedValue = exponent === 1 
      ? newVal // Linear case
      : Math.pow(newVal, exponent); // Power function for non-linear mapping
      
    // Convert normalized value back to range
    const rangeValue = min + mappedNormalizedValue * (max - min);
    setValue(rangeValue, e);
  };

  const { onMouseDown } = useMouseEditValue(containerRef, normalizedValue, handleValueChange, 0, 1);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (lockedModeRef.current) {
      e.stopPropagation();
      setIsEditing(true);
      onMouseDown(e as unknown as MouseEvent);

      // Add document-level mouse up listener
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleMouseUp = () => {
    setIsEditing(false);
    // Clean up event listener
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Calculate angle for knob display
  const angle = 20 + normalizedValue * 360;
  const displayAngle = (360 * angle) / 400;

  // SVG parameters - adjust line thickness for small sizes
  const radius = 40;
  const centerX = 50;
  const centerY = 50;

  // Calculate stroke width based on size (with minimum thickness for visibility)
  const knobSize = Math.min(dimensions.width, dimensions.height);
  const strokeWidth = knobSize < 20 ? 6 : knobSize < 40 ? 8 : 10;
  const indicatorWidth = knobSize < 20 ? 5 : knobSize < 40 ? 6 : 8;

  // Start angle is always 195 degrees (6:30)
  const startAngle = 195;
  const endAngle = displayAngle + 185;

  const getPath = (startAngle: number, endAngle: number): string => {
    // Convert angles to radians
    const startRadians = (Math.PI / 180) * (startAngle - 90);
    const endRadians = (Math.PI / 180) * (endAngle - 90);

    // Calculate start and end points
    const startX = centerX + radius * Math.cos(startRadians);
    const startY = centerY + radius * Math.sin(startRadians);
    const endX = centerX + radius * Math.cos(endRadians);
    const endY = centerY + radius * Math.sin(endRadians);

    // Determine if the arc should be the large arc or not
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    // Create the path data for the arc
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Calculate the size of the knob (minimum of width and height)
  const knobDisplaySize = Math.min(dimensions.width, dimensions.height);

  // Calculate margins to center the knob
  const horizontalMargin = (dimensions.width - knobDisplaySize) / 2;
  const verticalMargin = (dimensions.height - knobDisplaySize) / 2;

  // Show value indicator in almost all cases except extremely tiny knobs
  const showValueIndicator = isEditing && knobDisplaySize > 10;

  // Use the full available space
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center"
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          width: knobDisplaySize,
          height: knobDisplaySize,
          margin: `${verticalMargin}px ${horizontalMargin}px`,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          style={{ cursor: "pointer" }}
        >
          <path
            d={getPath(startAngle, 360 + 170)}
            stroke="#383838"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <path
            d={getPath(startAngle, endAngle)}
            stroke={knobColor as string}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Only show indicator line if there's enough space */}
          {knobDisplaySize > 8 && (
            <line
              x1="50"
              y1="50"
              x2="50"
              y2={knobDisplaySize < 30 ? 80 : 90}
              stroke="#383838"
              strokeWidth={indicatorWidth}
              transform={`rotate(${displayAngle}, 50, 50)`}
            />
          )}

          {/* Value display when editing - only for larger knobs */}
          {showValueIndicator && (
            <>
              {/* Semi-transparent background for better text visibility */}
              <rect
                x="15"
                y="30"
                width="70"
                height="40"
                rx="5"
                fill="rgba(0,0,0,0.7)"
              />
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fill="white"
                fontSize={knobDisplaySize < 25 ? 27 : knobDisplaySize < 40 ? 30 : 36}
                fontFamily="monospace"
              >
                {displayValue}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

export default AttrUIKnob;
