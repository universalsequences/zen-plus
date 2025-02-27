import React, { useCallback, useRef, useState, useEffect } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";
import { ObjectNode } from "@/lib/nodes/types";

const Button: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { value: message } = useValue();
  const { lockedMode } = useLocked();
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<number | null>(null);
  const messageRef = useRef<any>(undefined);
  
  const { label, fillColor, backgroundColor } = objectNode.attributes;
  const { width, height } = objectNode.size || { width: 50, height: 50 };
  const containerSize = Math.max(width, height);

  // Memoize the click handler
  const handleClick = useCallback(() => {
    if (lockedMode) {
      objectNode.receive(objectNode.inlets[0], "bang");
    }
  }, [lockedMode, objectNode]);

  // Track message changes and safely manage animation state
  useEffect(() => {
    // Only trigger animation when message actually changes
    if (message !== messageRef.current) {
      messageRef.current = message;

      // Clear any existing timer to prevent state conflicts
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      
      // Start animation
      setIsAnimating(true);
      
      // Set timer to turn off animation
      timerRef.current = window.setTimeout(() => {
        setIsAnimating(false);
        timerRef.current = null;
      }, 50);
    }
    
    // Clean up on unmount or before next effect
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message]);

  // Ensure animation never gets stuck on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Pre-compute static styles for better performance
  const containerStyle = {
    backgroundColor: backgroundColor as string,
    width: containerSize,
    height: containerSize,
  };

  const innerStyle = {
    backgroundColor: isAnimating ? "white" : fillColor as string,
  };

  return (
    <div
      onClick={handleClick}
      style={containerStyle}
      className="flex"
    >
      <div
        style={innerStyle}
        className={`m-1 border border-1 rounded-full flex-1 flex${
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