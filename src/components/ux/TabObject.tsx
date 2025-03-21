import React, { useEffect, useState } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";

const TabObject: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { lockedMode } = useLocked();
  const { value: message } = useValue();
  const { width, height } = objectNode.size || { width: 300, height: 30 };
  
  // Get selected tab from the node's custom data
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(
    typeof objectNode.custom?.value === "number" ? objectNode.custom.value : 0
  );
  
  // Track hover state for tab hover effects
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Parse options from comma-separated string
  const optionsString = objectNode.attributes["options"] as string || "";
  const tabOptions = optionsString
    .split(",")
    .map((opt) => opt.trim())
    .filter(Boolean);

  // Update local state when receiving a message
  useEffect(() => {
    if (message !== null && typeof message === "number") {
      setSelectedTabIndex(Math.min(Math.max(0, message), tabOptions.length - 1));
    }
  }, [message, tabOptions.length]);

  // Update local state when custom value changes
  useEffect(() => {
    if (typeof objectNode.custom?.value === "number") {
      setSelectedTabIndex(objectNode.custom.value);
    }
  }, [objectNode.custom?.value]);

  // Handle tab click by sending message to the node
  const handleTabClick = (index: number) => {
    if (!lockedMode) return;
    
    // Send the value to the inlet - this will trigger the node's logic
    objectNode.receive(objectNode.inlets[0], index);
    
    // Update local state immediately for responsiveness
    setSelectedTabIndex(index);
  };

  // Calculate tab dimensions
  const tabWidth = tabOptions.length > 0 ? width / tabOptions.length : width;
  const fontSize = Math.min(16, height * 0.6);

  // Customize colors based on attributes if provided
  const accentColor = objectNode.attributes["accent-color"] as string || "#2ad4bf"; // Default teal accent
  const baseColor = objectNode.attributes["base-color"] as string || "#27272a"; // Zinc-800
  const activeColor = objectNode.attributes["active-color"] as string || "#3f3f46"; // Zinc-700
  
  return (
    <div 
      className="flex flex-row text-white rounded-sm overflow-hidden"
      style={{ 
        width, 
        height,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
        background: baseColor
      }}
      onMouseDown={(e) => {
        if (lockedMode) {
          e.stopPropagation();
        }
      }}
    >
      {tabOptions.map((tabName, index) => {
        const isSelected = index === selectedTabIndex;
        const isHovered = index === hoverIndex;
        
        return (
          <div
            key={index}
            onClick={() => handleTabClick(index)}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            className="flex items-center justify-center cursor-pointer transition-all duration-200 relative"
            style={{
              width: tabWidth,
              height: "100%",
              fontSize: `${fontSize}px`,
              fontWeight: isSelected ? 500 : 400,
              backgroundColor: isSelected ? activeColor : (isHovered ? `rgba(255,255,255,0.05)` : "transparent"),
              color: isSelected ? "#ffffff" : "rgba(255,255,255,0.7)"
            }}
          >
            {/* Tab name */}
            {tabName}
            
            {/* Selected tab indicator line */}
            {isSelected && (
              <div 
                className="absolute bottom-0 left-0 w-full h-[2px] transition-all"
                style={{ 
                  backgroundColor: accentColor,
                  boxShadow: `0 0 8px ${accentColor}80`
                }}
              />
            )}
            
            {/* Separator between tabs (except for the last one) */}
            {index < tabOptions.length - 1 && !isSelected && (
              <div 
                className="absolute right-0 h-[60%] w-[1px] opacity-20"
                style={{ backgroundColor: "#ffffff" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TabObject;
