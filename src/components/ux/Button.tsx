import React, { useCallback, useState, useRef } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";
import { ObjectNode } from "@/lib/nodes/types";

const Button: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { value: message } = useValue();
  const { lockedMode } = useLocked();
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimer = useRef<NodeJS.Timeout>();

  const { label, fillColor, backgroundColor } = objectNode.attributes;
  const { width, height } = objectNode.size || { width: 50, height: 50 };

  // Memoize the click handler
  const handleClick = useCallback(() => {
    if (lockedMode) {
      objectNode.receive(objectNode.inlets[0], "bang");
    }
  }, [lockedMode, objectNode]);

  // Use CSS transitions for smooth animation
  React.useEffect(() => {
    if (message !== undefined) {
      // Clear any existing animation timer
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }

      // Reset animation state
      setIsAnimating(false);

      // Force a reflow to restart animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
        animationTimer.current = setTimeout(() => {
          setIsAnimating(false);
        }, 1000);
      });
    }

    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, [message]);

  const containerSize = Math.max(width, height);

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: backgroundColor as string,
        width: containerSize,
        height: containerSize,
      }}
      className="flex"
    >
      <div
        style={{
          backgroundColor: fillColor as string,
        }}
        className={`${isAnimating ? "animate-color" : ""} m-1 border border-1 rounded-full flex-1 flex${
          lockedMode ? " cursor-pointer" : ""
        }`}
      >
        <div className="m-auto text-white">{label}</div>
      </div>
    </div>
  );
};

// Prevent unnecessary re-renders
export default React.memo(Button);
