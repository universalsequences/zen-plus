import React, { useMemo } from 'react';
import { ObjectNode } from '@/lib/nodes/types';

interface SpatialLayoutViewProps {
  objects: ObjectNode[];         // All objects (unfiltered) - used for calculating layout bounds
  visibleObjects?: ObjectNode[]; // Only the objects that are visible (filtered) - what to display
  selectedIndex: number;
  width: number;
  height: number;
  className?: string;
  onSelectObject?: (index: number) => void;
  onSelectedObjectPosition?: (x: number, y: number, width: number, height: number) => void;
}

/**
 * Renders a spatial visualization of objects in a patch
 */
export const SpatialLayoutView: React.FC<SpatialLayoutViewProps> = ({
  objects,
  visibleObjects,
  selectedIndex,
  width,
  height,
  className = '',
  onSelectObject,
  onSelectedObjectPosition
}) => {
  // If visibleObjects is not provided, use objects
  const objectsToDisplay = visibleObjects || objects;
  // Calculate the bounding box based on ALL objects (without filtering)
  // to ensure stable positioning and sizing
  const { bounds, objectsWithNormalizedPositions } = useMemo(() => {
    // Use a stable representation of the full layout
    // This way we calculate bounds independently of which objects are currently filtered
    
    // First find all unique objects based on their positions
    const uniquePositionedObjects = new Map();
    
    // Add all objects to the map to get a unique set of positions
    objects.forEach((obj) => {
      if (obj.position) {
        // Use position as a key to avoid duplicates when filtering
        const key = `${obj.position.x || 0},${obj.position.y || 0}`;
        uniquePositionedObjects.set(key, obj);
      }
    });
    
    // Convert back to array for calculations
    const allObjects = Array.from(uniquePositionedObjects.values());
    
    if (allObjects.length === 0) {
      return { 
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        objectsWithNormalizedPositions: []
      };
    }
    
    // Initialize min/max with first object's position
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    // Find min/max coordinates from all collected objects
    allObjects.forEach((obj) => {
      if (!obj.position) return;
      
      const x = obj.position.x ?? 0;
      const y = obj.position.y ?? 0;
      const width = obj.size?.width ?? 60;
      const height = obj.size?.height ?? 30;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    // Provide default values if no objects have positions
    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 100;
      maxY = 100;
    }
    
    // Add some padding
    const paddingX = (maxX - minX) * 0.1;
    const paddingY = (maxY - minY) * 0.1;
    
    minX -= paddingX;
    minY -= paddingY;
    maxX += paddingX;
    maxY += paddingY;
    
    // Create objects with normalized positions for the objects to display
    const objectsWithNormalizedPositions = objectsToDisplay.map((obj, index) => {
      if (!obj.position) {
        return {
          id: obj.id,
          index,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          isVisible: false
        };
      }
      
      const x = obj.position.x ?? 0;
      const y = obj.position.y ?? 0;
      const objWidth = obj.size?.width ?? 60;
      const objHeight = obj.size?.height ?? 30;
      
      return {
        id: obj.id,
        index,
        x: (x - minX) / (maxX - minX),
        y: (y - minY) / (maxY - minY),
        width: objWidth / (maxX - minX),
        height: objHeight / (maxY - minY),
        isVisible: true
      };
    });
    
    return {
      bounds: { minX, minY, maxX, maxY },
      objectsWithNormalizedPositions
    };
  }, [objects, objectsToDisplay]);
  
  // Use a ref to store the callback to avoid it triggering rerenders
  const callbackRef = React.useRef(onSelectedObjectPosition);
  
  // Update the callback ref when it changes
  React.useEffect(() => {
    callbackRef.current = onSelectedObjectPosition;
  }, [onSelectedObjectPosition]);
  
  // Render effect to calculate and report position
  // Using a dedicated rendering effect for position calculation
  React.useLayoutEffect(() => {
    // Skip if no objects or no selected index
    if (
      selectedIndex < 0 || 
      selectedIndex >= objectsWithNormalizedPositions.length || 
      !callbackRef.current
    ) {
      return;
    }
    
    const selectedObj = objectsWithNormalizedPositions[selectedIndex];
    if (!selectedObj || !selectedObj.isVisible) {
      return;
    }
    
    // Calculate position once per render
    const x = selectedObj.x * width;
    const y = selectedObj.y * height;
    const w = selectedObj.width * width;
    const h = selectedObj.height * height;
    
    // Call the callback with the position
    // Using setTimeout(0) to break the call stack and prevent re-render loops
    setTimeout(() => {
      if (callbackRef.current) {
        callbackRef.current(x, y, w, h);
      }
    }, 0);
  }, [selectedIndex, objectsWithNormalizedPositions, width, height]);
  
  // If there are no objects with positions, show a message
  if (objectsWithNormalizedPositions.length === 0 || 
      !objectsWithNormalizedPositions.some(obj => obj.isVisible)) {
    return (
      <div className={`spatial-layout text-center flex items-center justify-center text-zinc-500 text-xs ${className}`} 
        style={{ width, height }}>
        No position data available
      </div>
    );
  }
  
  return (
    <div 
      className={`spatial-layout relative bg-zinc-900 border border-zinc-800 rounded ${className}`} 
      style={{ width, height }}
    >
      {objectsWithNormalizedPositions.map((obj) => {
        if (!obj.isVisible) return null;
        
        // An object is selected if its array index matches the selectedIndex
        // or if selectedIndex is -1 (no selection), no objects are highlighted
        const isSelected = selectedIndex >= 0 && obj.index === selectedIndex;
        
        return (
          <div 
            key={obj.id}
            className={`absolute ${isSelected ? 'border-white' : 'border-gray-600'} border cursor-pointer`}
            style={{
              left: `${obj.x * 100}%`,
              top: `${obj.y * 100}%`,
              width: `${obj.width * 100}%`,
              height: `${obj.height * 100}%`,
              backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'border-color 0.2s ease, background-color 0.2s ease'
            }}
            onClick={() => onSelectObject && onSelectObject(obj.index)}
          />
        );
      })}
    </div>
  );
};