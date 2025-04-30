import React, { useCallback, useEffect, useRef, useState } from "react";
import { ObjectNode } from "../../lib/nodes/ObjectNode";
import { useValue } from "../../contexts/ValueContext";
import { useLocked } from "../../contexts/LockedContext";
import { usePosition } from "../../contexts/PositionContext";
import { FilterGraphValue, FilterType } from "../../lib/nodes/definitions/core/filtergraph";

export type FilterGraphProps = {
  objectNode: ObjectNode;
};

// Helper to compute frequency response for different filter types
const computeFrequencyResponse = (
  filterType: FilterType,
  frequency: number,
  cutoff: number,
  resonance: number,
  gain: number
): number => {
  // Convert to logarithmic scale for better visualization
  const logF = Math.log10(frequency);
  const logCutoff = Math.log10(cutoff);
  
  // Filter response calculations with proper curve shapes
  switch (filterType) {
    case "lowpass": {
      // Lowpass filter with continuous curve and resonance
      const octaves = logF - logCutoff;
      
      if (octaves < -1) {
        // Flat response well below cutoff
        return 0;
      } else {
        // Create a function that asymptotically approaches -60dB for higher frequencies
        const rolloffFactor = Math.min(1, 0.8 + resonance * 0.05); // Higher resonance = steeper slope
        const rolloff = -40 * Math.max(0, Math.tanh(octaves * 2 * rolloffFactor));
        
        // Resonance peak near cutoff
        const resFactor = Math.max(0, resonance - 0.7);
        const resPeak = resFactor * 6 * Math.exp(-36 * (octaves - 0.05) * (octaves - 0.05));
        
        // Combine for final response
        return rolloff + resPeak;
      }
    }
    
    case "highpass": {
      // Highpass filter with continuous curve and resonance
      const octaves = logCutoff - logF;
      
      if (octaves < -1) {
        // Flat response well above cutoff
        return 0;
      } else {
        // Create a function that asymptotically approaches -60dB for lower frequencies
        const rolloffFactor = Math.min(1, 0.8 + resonance * 0.05); // Higher resonance = steeper slope
        const rolloff = -40 * Math.max(0, Math.tanh(octaves * 2 * rolloffFactor));
        
        // Resonance peak near cutoff
        const resFactor = Math.max(0, resonance - 0.7);
        const resPeak = resFactor * 6 * Math.exp(-36 * (octaves - 0.05) * (octaves - 0.05));
        
        // Combine for final response
        return rolloff + resPeak;
      }
    }
    
    case "bandpass": {
      // Classic bandpass filter with bell shape
      const octaves = Math.abs(logF - logCutoff);
      
      // Bandwidth decreases (narrows) with higher resonance
      const bandwidth = 0.8 / resonance;
      
      // Far from center frequency - silent
      if (octaves > bandwidth * 3) {
        return -60; // Effectively silent
      }
      
      // Height scales with resonance - positive gain at center
      const peakGain = Math.min(18, 6 + resonance * 0.8);
      
      // Classic bell curve shape
      // Start at -60dB at edges, rise to peak gain at center
      const normalizedDistance = octaves / bandwidth;
      
      // Simple gaussian curve shape centered at 0
      // As resonance increases, the curve gets narrower and taller
      return peakGain * Math.exp(-2 * normalizedDistance * normalizedDistance) - 60 * (1 - Math.exp(-normalizedDistance * normalizedDistance));
    }
    
    case "notch": {
      // Continuous notch filter (inverse bell curve)
      const octaves = Math.abs(logF - logCutoff);
      
      // Bandwidth decreases (narrows) with higher resonance
      const bandwidth = 0.5 / resonance;
      
      // Depth of notch increases with resonance (max -60dB)
      const depth = -Math.min(60, 20 + resonance * 10);
      
      // Calculate notch that reaches asymptote of 0dB
      if (octaves < bandwidth * 0.1) {
        // Center of notch - full depth
        return depth;
      } else {
        // Transition back to 0 smoothly
        return depth * Math.exp(-Math.pow(octaves / bandwidth, 1.5));
      }
    }
    
    case "peak": {
      // Simple, continuous peak filter - smooth bell curve
      const octaves = Math.abs(logF - logCutoff);
      
      // Bandwidth narrows with higher resonance
      const bandwidth = 0.8 / resonance;
      
      // Sharper falloff with higher resonance (to ensure it reaches zero)
      const falloffExponent = Math.min(2.5, 1.5 + resonance * 0.15);
      
      // Bell curve that approaches 0 at the edges
      if (octaves > bandwidth * 3) {
        // Far from center - flat response (0)
        return 0;
      } else {
        // Simple bell curve with scaled falloff
        return gain * Math.exp(-Math.pow(octaves / bandwidth, falloffExponent));
      }
    }
    
    case "lowshelf": {
      // Improved lowshelf with proper endpoints
      const octaves = logF - logCutoff;
      
      // Steepness increases with resonance
      const slope = 2 * resonance;
      
      // Handle extreme edges first
      if (octaves < -2) {
        // Far below cutoff - full gain
        return gain;
      } else if (octaves > 2) {
        // Far above cutoff - flat (0)
        return 0;
      } else {
        // Transition region - smooth sigmoid
        // Transforms from gain to 0 with more slope control
        const transitionPosition = Math.max(-1, Math.min(1, octaves * slope));
        const transitionCurve = 0.5 - 0.5 * Math.tanh(transitionPosition * 1.5);
        
        // Add resonance bump near transition when resonance is high
        let resonanceBump = 0;
        if (resonance > 1) {
          const bumpFactor = (resonance - 1) * 0.2;
          resonanceBump = gain * bumpFactor * Math.sign(gain) * Math.exp(-16 * Math.pow(octaves + 0.1, 2));
        }
        
        return gain * transitionCurve + resonanceBump;
      }
    }
    
    case "highshelf": {
      // Improved highshelf with proper endpoints
      const octaves = logCutoff - logF;
      
      // Steepness increases with resonance
      const slope = 2 * resonance;
      
      // Handle extreme edges first
      if (octaves < -2) {
        // Far below cutoff - flat (0)
        return 0;
      } else if (octaves > 2) {
        // Far above cutoff - full gain
        return gain;
      } else {
        // Transition region - smooth sigmoid
        // Transforms from 0 to gain with more slope control
        const transitionPosition = Math.max(-1, Math.min(1, octaves * slope));
        const transitionCurve = 0.5 + 0.5 * Math.tanh(transitionPosition * 1.5);
        
        // Add resonance bump near transition when resonance is high
        let resonanceBump = 0;
        if (resonance > 1) {
          const bumpFactor = (resonance - 1) * 0.2;
          resonanceBump = gain * bumpFactor * Math.sign(gain) * Math.exp(-16 * Math.pow(octaves - 0.1, 2));
        }
        
        return gain * transitionCurve + resonanceBump;
      }
    }
    
    default:
      return 0;
  }
};

// Map from normalized canvas coordinates to frequency (log scale from 20Hz to 20kHz)
const mapToFrequency = (x: number, width: number): number => {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const logRange = maxLog - minLog;
  
  const logFreq = minLog + (x / width) * logRange;
  return 10 ** logFreq;
};

// Map from frequency to normalized canvas x-coordinate
const mapFromFrequency = (freq: number, width: number): number => {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const logRange = maxLog - minLog;
  
  const logFreq = Math.log10(freq);
  return ((logFreq - minLog) / logRange) * width;
};

// Map from dB to canvas y-coordinate
const mapFromDb = (db: number, height: number): number => {
  // Map from -40dB to +20dB to canvas height
  const minDb = -40;
  const maxDb = 20;
  const dbRange = maxDb - minDb;
  
  // Invert Y axis so positive gain goes up
  return height - ((db - minDb) / dbRange) * height;
};

// Map from canvas y-coordinate to dB
const mapToDb = (y: number, height: number): number => {
  const minDb = -40;
  const maxDb = 20;
  const dbRange = maxDb - minDb;
  
  // Invert Y axis so positive gain goes up
  return minDb + (1 - y / height) * dbRange;
};

// The frequency marks to display on the x-axis
const frequencyMarks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
// The dB marks to display on the y-axis
const dbMarks = [-40, -30, -20, -10, 0, 10, 20];

// The main FilterGraph component
const FilterGraph: React.FC<FilterGraphProps> = ({ objectNode }) => {
  const { isLocked } = useLocked();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = objectNode.size || { width: 200, height: 100 };
  
  // Get the filter parameters from the custom value
  const custom = objectNode.custom as FilterGraphValue;
  
  // Subscribe to value changes
  const value = useValue(custom.id);
  
  // Get the current filter parameters
  const [filterParams, setFilterParams] = useState({
    type: custom.filterType,
    cutoff: custom.cutoff,
    resonance: custom.resonance,
    gain: custom.gain
  });
  
  // Update filter params when node.onNewValue is called
  useEffect(() => {
    if (objectNode.newValue && typeof objectNode.newValue === 'object') {
      const newParams = objectNode.newValue as FilterParams;
      setFilterParams(newParams);
    }
  }, [objectNode.newValue]);
  
  // Interaction state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Update local state when the custom value itself changes
  useEffect(() => {
    setFilterParams({
      type: custom.filterType,
      cutoff: custom.cutoff,
      resonance: custom.resonance,
      gain: custom.gain
    });
  }, [value]);
  
  // Draw the frequency response curve
  const drawFilterResponse = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const { width, height } = canvas;
    const { type, cutoff, resonance, gain } = filterParams;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = objectNode.attributes["backgroundColor"] || "#303030";
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = objectNode.attributes["gridColor"] || "#666666";
    ctx.lineWidth = 0.5;
    
    // Draw frequency grid lines (logarithmic)
    frequencyMarks.forEach(freq => {
      const x = mapFromFrequency(freq, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Draw frequency labels
      ctx.fillStyle = objectNode.attributes["textColor"] || "#ffffff";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      
      // Format frequency labels
      let label = freq.toString();
      if (freq >= 1000) {
        label = (freq / 1000) + "k";
      }
      
      ctx.fillText(label, x, height - 2);
    });
    
    // Draw dB grid lines
    dbMarks.forEach(db => {
      const y = mapFromDb(db, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Draw dB labels
      ctx.fillStyle = objectNode.attributes["textColor"] || "#ffffff";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(db + "dB", 25, y + 3);
    });
    
    // Draw the filter response curve with enhanced quality
    ctx.strokeStyle = objectNode.attributes["curveColor"] || "#ff9500";
    ctx.lineWidth = 2;
    
    // Use anti-aliasing techniques
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Enable shadow for a subtle glow effect
    ctx.shadowColor = objectNode.attributes["curveColor"] || "#ff9500";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.beginPath();
    
    // Use many more points for a much smoother curve
    const numPoints = 300; // Increased from 100 for smoother curves
    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * width;
      const frequency = mapToFrequency(x, width);
      const response = computeFrequencyResponse(type, frequency, cutoff, resonance, gain);
      const y = mapFromDb(response, height);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use quadratic curves instead of straight lines for smoother appearance
        if (i % 3 === 0 && i > 3 && i < numPoints - 3) {
          // For every third point, use a quadratic curve
          const prevX = ((i - 1) / numPoints) * width;
          const prevFreq = mapToFrequency(prevX, width);
          const prevResponse = computeFrequencyResponse(type, prevFreq, cutoff, resonance, gain);
          const prevY = mapFromDb(prevResponse, height);
          
          const midX = (x + prevX) / 2;
          ctx.quadraticCurveTo(prevX, prevY, midX, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    
    // Draw the main stroke
    ctx.stroke();
    
    // Reset shadow for other elements
    ctx.shadowBlur = 0;
    
    // Draw cutoff frequency indicator (vertical line)
    const cutoffX = mapFromFrequency(cutoff, width);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cutoffX, 0);
    ctx.lineTo(cutoffX, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Calculate the control point Y position - direct mapping to parameters
    // This ensures the control point exactly follows the mouse position
    let controlPointY;
    
    if (["peak", "lowshelf", "highshelf"].includes(type)) {
      // For peak and shelf filters, directly map to gain value
      controlPointY = mapFromDb(gain, height);
    } else {
      // For lowpass/highpass/bandpass/notch filters, directly map to resonance value
      // Ensure full range of canvas height maps to resonance range (0.1-20)
      const resonanceMin = 0.1;
      const resonanceMax = 20;
      
      // Calculate percentage of resonance within its range
      const resonancePercent = (resonance - resonanceMin) / (resonanceMax - resonanceMin);
      
      // Map to y position (higher resonance = lower y value)
      controlPointY = height * (1 - resonancePercent);
    }
    
    // Draw cutoff frequency dragpoint (control circle)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cutoffX, controlPointY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw filter type label
    ctx.fillStyle = objectNode.attributes["textColor"] || "#ffffff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(type, 5, 12);
    
    // Draw parameter values
    ctx.font = "9px sans-serif";
    ctx.fillText(`Cutoff: ${Math.round(cutoff)}Hz`, 5, 24);
    ctx.fillText(`Q: ${resonance.toFixed(2)}`, 5, 36);
    if (["peak", "lowshelf", "highshelf"].includes(type)) {
      ctx.fillText(`Gain: ${gain.toFixed(1)}dB`, 5, 48);
    }
  }, [filterParams, objectNode.attributes, width, height]);
  
  // Draw the filter response when parameters change
  useEffect(() => {
    drawFilterResponse();
  }, [drawFilterResponse]);
  
  // Setup window-level event listeners for mouse tracking
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging || isLocked) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Calculate position relative to canvas, but allow movement outside
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Allow moving throughout the entire canvas height
      // But constrain to valid parameter ranges for calculations
      const xConstrained = Math.max(0, Math.min(canvas.width, x));
      const yConstrained = Math.max(0, Math.min(canvas.height, y));
      
      // Update cutoff frequency based on x position
      const newCutoff = mapToFrequency(xConstrained, canvas.width);
      
      let newParams = { ...filterParams };
      
      // Update cutoff in all cases
      newParams.cutoff = Math.max(20, Math.min(20000, newCutoff));
      
      // For peak and shelf filters, y directly controls gain
      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        // Map y position directly to dB (-40 to +20 dB range)
        const newDb = mapToDb(yConstrained, canvas.height);
        newParams.gain = Math.max(-40, Math.min(20, newDb));
      } else {
        // For other filters, map y position directly to resonance value
        // Map from top (max resonance) to bottom (min resonance)
        // This ensures the control point follows the mouse exactly
        const resonanceMin = 0.1;
        const resonanceMax = 20;
        // Calculate percentage from top (0) to bottom (1)
        const yPercent = yConstrained / canvas.height;
        // Invert so top = max, bottom = min
        const resonanceValue = resonanceMax - yPercent * (resonanceMax - resonanceMin);
        newParams.resonance = resonanceValue;
      }
      
      // Update internal state
      setFilterParams(newParams);
      
      // Send parameters to the node
      custom.setCutoff(newParams.cutoff);
      custom.setResonance(newParams.resonance);
      
      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        custom.setGain(newParams.gain);
      }
      
      // Output message with updated parameter
      objectNode.receive(objectNode.inlets[0], ["cutoff", newParams.cutoff]);
      objectNode.receive(objectNode.inlets[0], ["resonance", newParams.resonance]);
      
      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        objectNode.receive(objectNode.inlets[0], ["gain", newParams.gain]);
      }
    };
    
    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };
    
    // Add window-level event listeners when dragging starts
    if (isDragging) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, isLocked, dragStart, filterParams, custom, objectNode]);
  
  // Calculate control point Y position for hit testing - direct mapping to parameters
  const getControlPointY = (type: FilterType, cutoff: number, resonance: number, gain: number, height: number) => {
    if (["peak", "lowshelf", "highshelf"].includes(type)) {
      // For peak and shelf filters, directly map to gain value
      return mapFromDb(gain, height);
    } else {
      // For lowpass/highpass/bandpass/notch filters, directly map to resonance value
      // Ensure full range of canvas height maps to resonance range (0.1-20)
      const resonanceMin = 0.1;
      const resonanceMax = 20;
      
      // Calculate percentage of resonance within its range
      const resonancePercent = (resonance - resonanceMin) / (resonanceMax - resonanceMin);
      
      // Map to y position (higher resonance = lower y value)
      return height * (1 - resonancePercent);
    }
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cutoffX = mapFromFrequency(filterParams.cutoff, canvas.width);
    
    // Get the control point Y position using the same calculation as in draw
    const controlPointY = getControlPointY(
      filterParams.type,
      filterParams.cutoff,
      filterParams.resonance,
      filterParams.gain,
      canvas.height
    );
    
    // Check if click is near the control point
    const distance = Math.sqrt(Math.pow((x - cutoffX), 2) + Math.pow((y - controlPointY), 2));
    if (distance < 10) {
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };
  
  // Handle double click to cycle through filter types
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isLocked) return;
    
    const filterTypes: FilterType[] = [
      "lowpass", "highpass", "bandpass", "notch", "peak", "lowshelf", "highshelf"
    ];
    
    const currentIndex = filterTypes.indexOf(filterParams.type);
    const nextIndex = (currentIndex + 1) % filterTypes.length;
    const newType = filterTypes[nextIndex];
    
    // Update the filter type
    custom.setFilterType(newType);
    
    // Send the type message
    objectNode.receive(objectNode.inlets[0], ["type", newType]);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ 
        cursor: isLocked ? "default" : (
          isDragging ? "grabbing" : "pointer"
        ),
        userSelect: "none",
        touchAction: "none" // Prevent scrolling while interacting
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
};

export default FilterGraph;