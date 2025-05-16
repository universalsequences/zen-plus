import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ObjectNode } from "../../lib/nodes/ObjectNode";
import { useValue } from "../../contexts/ValueContext";
import { useLocked } from "../../contexts/LockedContext";
import {
  FilterGraphValue,
  FilterType,
  FilterParams,
  Filter,
} from "../../lib/nodes/definitions/core/filtergraph";

export type FilterGraphProps = {
  objectNode: ObjectNode;
};

// Helper to compute frequency response for different filter types
const computeFrequencyResponse = (
  filterType: FilterType,
  frequency: number,
  cutoff: number,
  resonance: number,
  gain: number,
): number => {
  // Convert to logarithmic scale for better visualization
  const logF = Math.log10(frequency);
  const logCutoff = Math.log10(cutoff);

  // Filter response calculations with proper curve shapes
  switch (filterType) {
    case "lowpass": {
      // Emulate Ableton's 24 dB/octave lowpass filter with even steeper transitions
      const octaves = logF - logCutoff;

      // Normalize resonance to Q factor (range: 0.1 to 20)
      const q = Math.max(0.1, Math.min(20, resonance));

      // Frequency ratio (ω/ωc)
      const w = Math.pow(10, octaves);

      // Amplify Q's effect for sharper peaks and steeper transitions
      const effectiveQ = q * (1 + q * 10); // Stronger Q scaling for high resonance

      // Introduce a sharper cutoff effect by increasing the filter order
      const steepnessFactor = 1 + (q / 20) * 12; // Increase steepness with Q
      const denominator = Math.sqrt(
        1.0 +
          Math.pow(w, Math.pow(q, 0.5) * 6) * steepnessFactor + // Higher-order term for steeper rolloff
          Math.pow(w, 4) * (1 + (q / 20) * 10.5) + // Adjusted 4th-order term
          (10.5 * Math.pow(w, 3)) / effectiveQ + // Sharper damping term
          (100 * (2.0 * Math.pow(w, 2))) / Math.pow(effectiveQ, 2), // Sharper resonance term
      );

      // Calculate raw magnitude
      let rawMagnitude = 1.0 / denominator;

      // Add very sharp resonance boost
      const resonanceBoost = ((q - 0.1) / (20 - 0.1)) * 32; // Max 32 dB at Q=20
      const peakFactor = Math.exp(-16 * Math.pow(octaves - 0.03, 2)); // Even narrower, sharper peak
      rawMagnitude *= Math.pow(10, (resonanceBoost * peakFactor) / 20);

      // Convert to dB
      let responseDb = 20.0 * Math.log10(rawMagnitude);

      // Clamp to visible range (-60 dB to +20 dB)
      return Math.max(-60, Math.min(20, responseDb));
    }

    case "highpass": {
      // Emulate Ableton's 24 dB/octave highpass filter with steep transitions
      const octaves = logCutoff - logF; // Inverted for highpass (opposite of lowpass)

      // Normalize resonance to Q factor (range: 0.1 to 20)
      const q = Math.max(0.1, Math.min(20, resonance));

      // Frequency ratio (ω/ωc)
      const w = Math.pow(10, octaves);

      // Amplify Q's effect for sharper peaks and steeper transitions
      const effectiveQ = q * (1 + q * 10); // Match lowpass Q scaling

      // Introduce a sharper cutoff effect by increasing the filter order
      const steepnessFactor = 1 + (q / 20) * 12; // Match lowpass steepness scaling
      const denominator = Math.sqrt(
        1.0 +
          Math.pow(w, Math.pow(q, 0.5) * 6) * steepnessFactor + // Higher-order term for steeper rolloff
          Math.pow(w, 4) * (1 + (q / 20) * 10.5) + // Adjusted 4th-order term
          (10.5 * Math.pow(w, 3)) / effectiveQ + // Sharper damping term
          (100 * (2.0 * Math.pow(w, 2))) / Math.pow(effectiveQ, 2), // Sharper resonance term
      );

      // Calculate raw magnitude for highpass (invert lowpass behavior)
      let rawMagnitude = 1.0 / denominator;

      // Add very sharp resonance boost, mirrored for highpass
      const resonanceBoost = ((q - 0.1) / (20 - 0.1)) * 32; // Max 32 dB at Q=20
      const peakFactor = Math.exp(-16 * Math.pow(octaves + 0.03, 2)); // Peak just above cutoff
      rawMagnitude *= Math.pow(10, (resonanceBoost * peakFactor) / 20);

      // Convert to dB
      let responseDb = 20.0 * Math.log10(rawMagnitude);

      // Clamp to visible range (-60 dB to +20 dB)
      return Math.max(-60, Math.min(20, responseDb));
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
      const normalizedDistance = octaves / bandwidth;

      // Simple gaussian curve shape centered at 0
      return (
        peakGain * Math.exp(-2 * normalizedDistance * normalizedDistance) -
        60 * (1 - Math.exp(-normalizedDistance * normalizedDistance))
      );
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

      // Sharper falloff with higher resonance
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
        const transitionPosition = Math.max(-1, Math.min(1, octaves * slope));
        const transitionCurve = 0.5 - 0.5 * Math.tanh(transitionPosition * 1.5);

        // Add resonance bump near transition when resonance is high
        let resonanceBump = 0;
        if (resonance > 1) {
          const bumpFactor = (resonance - 1) * 0.2;
          resonanceBump =
            gain * bumpFactor * Math.sign(gain) * Math.exp(-16 * Math.pow(octaves + 0.1, 2));
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
        const transitionPosition = Math.max(-1, Math.min(1, octaves * slope));
        const transitionCurve = 0.5 + 0.5 * Math.tanh(transitionPosition * 1.5);

        // Add resonance bump near transition when resonance is high
        let resonanceBump = 0;
        if (resonance > 1) {
          const bumpFactor = (resonance - 1) * 0.2;
          resonanceBump =
            gain * bumpFactor * Math.sign(gain) * Math.exp(-16 * Math.pow(octaves - 0.1, 2));
        }

        return gain * transitionCurve + resonanceBump;
      }
    }

    default:
      return 0;
  }
};

// Map from normalized coordinates to frequency (log scale from 20Hz to 20kHz)
const mapToFrequency = (x: number, width: number): number => {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const logRange = maxLog - minLog;

  const logFreq = minLog + (x / width) * logRange;
  return 10 ** logFreq;
};

// Map from frequency to normalized x-coordinate
const mapFromFrequency = (freq: number, width: number): number => {
  const minLog = Math.log10(20);
  const maxLog = Math.log10(20000);
  const logRange = maxLog - minLog;

  const logFreq = Math.log10(freq);
  return ((logFreq - minLog) / logRange) * width;
};

// Map from dB to y-coordinate
const mapFromDb = (db: number, height: number): number => {
  // Map from -40dB to +20dB to height
  const minDb = -40;
  const maxDb = 20;
  const dbRange = maxDb - minDb;

  // Invert Y axis so positive gain goes up
  return height - ((db - minDb) / dbRange) * height;
};

// Map from y-coordinate to dB
const mapToDb = (y: number, height: number): number => {
  const minDb = -40;
  const maxDb = 20;
  const dbRange = maxDb - minDb;

  // Invert Y axis so positive gain goes up
  return minDb + (1 - y / height) * dbRange;
};

// Define sets of frequency marks for different sizes
const frequencyMarkSets = {
  xs: [20, 1000, 20000], // For very small widths (<100px)
  sm: [20, 200, 1000, 20000], // For small widths (<150px)
  md: [20, 100, 1000, 10000, 20000], // For medium widths (<200px)
  lg: [20, 50, 200, 1000, 5000, 20000], // For large widths (<300px)
  xl: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], // For extra large widths (>=300px)
};

// Define sets of dB marks for different sizes
const dbMarkSets = {
  xs: [-40, 0, 20], // For very small heights (<80px)
  sm: [-40, -20, 0, 20], // For small heights (<120px)
  md: [-40, -20, -10, 0, 10, 20], // For medium heights (<150px)
  lg: [-40, -30, -20, -10, 0, 10, 20], // For large heights (>=150px)
};

// Calculate control point Y position based on filter parameters
const getControlPointY = (
  type: FilterType,
  cutoff: number,
  resonance: number,
  gain: number,
  height: number,
) => {
  if (["peak", "lowshelf", "highshelf"].includes(type)) {
    // For peak and shelf filters, directly map to gain value
    return mapFromDb(gain, height);
  } else {
    // For lowpass/highpass/bandpass/notch filters, directly map to resonance value
    const resonanceMin = 0.1;
    const resonanceMax = 20;

    // Calculate percentage of resonance within its range
    const resonancePercent = (resonance - resonanceMin) / (resonanceMax - resonanceMin);

    // Map to y position (higher resonance = lower y value)
    return height * (1 - resonancePercent);
  }
};

// The main FilterGraph component using SVG
const FilterGraphSVG: React.FC<FilterGraphProps> = ({ objectNode }) => {
  const { isLocked } = useLocked();
  const { width, height } = objectNode.size || { width: 200, height: 100 };

  // Get the filter parameters from the custom value
  const custom = objectNode.custom as FilterGraphValue;

  // Subscribe to value changes
  const { value } = useValue();
  // Track all filters and number of active filters
  const [allFilters, setAllFilters] = useState<Filter[]>(custom.getAllFilters());
  const [numFilters, setNumFilters] = useState<number>(
    Number(objectNode.attributes["activeFilters"]) || 1,
  );
  const [activeFilterIndex, setActiveFilterIndex] = useState<number>(0);

  // Get the current filter parameters for the active filter
  const [filterParams, setFilterParams] = useState({
    type: custom.filterType,
    cutoff: custom.cutoff,
    resonance: custom.resonance,
    gain: custom.gain,
    filterIndex: 0,
  });

  // Update filter params when node.onNewValue is called
  useEffect(() => {
    if (!value) return;

    const newParams = value as FilterParams & {
      allFilters?: Filter[];
      numFilters?: number;
    };

    // Update the current filter parameters
    setFilterParams({
      type: newParams.type,
      cutoff: newParams.cutoff,
      resonance: newParams.resonance,
      gain: newParams.gain,
      filterIndex: newParams.filterIndex || 0,
    });

    // Update the active filter index if provided
    if (newParams.filterIndex !== undefined) {
      setActiveFilterIndex(newParams.filterIndex);
    }

    const allFilters = custom.getAllFilters();

    // Update all filters if provided
    setAllFilters([...allFilters]);

    // Update number of active filters if provided
    if (newParams.numFilters !== undefined) {
      setNumFilters(newParams.numFilters);
    }
  }, [value]);

  // Interaction state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update local state when the custom value itself changes
  useEffect(() => {
    setAllFilters([...custom.getAllFilters()]);
    setNumFilters(Number(objectNode.attributes["activeFilters"]) || 1);

    // Update active filter parameters
    setFilterParams({
      type: custom.filterType,
      cutoff: custom.cutoff,
      resonance: custom.resonance,
      gain: custom.gain,
      filterIndex: custom.activeFilterIndex,
    });

    setActiveFilterIndex(custom.activeFilterIndex);
  }, [value, objectNode.attributes]);

  // Generate response curve paths for all active filters
  const responsePathsData = useMemo(() => {
    const paths: { path: string; filter: Filter; index: number }[] = [];

    // Generate a curve for each active filter
    for (let i = 0; i < numFilters; i++) {
      if (i < allFilters.length) {
        const filter = allFilters[i];
        const numPoints = 300; // High number of points for smooth curve
        let pathData = "";

        for (let j = 0; j <= numPoints; j++) {
          const x = (j / numPoints) * width;
          const frequency = mapToFrequency(x, width);
          const response = computeFrequencyResponse(
            filter.type,
            frequency,
            filter.cutoff,
            filter.resonance,
            filter.gain,
          );
          const y = mapFromDb(response, height);

          if (j === 0) {
            pathData += `M ${x},${y}`;
          } else {
            pathData += ` L ${x},${y}`;
          }
        }

        paths.push({
          path: pathData,
          filter: filter,
          index: i,
        });
      }
    }

    return paths;
  }, [allFilters, numFilters, width, height]);

  // Calculate cutoff line and control point positions for each filter
  const filterPositions = useMemo(() => {
    return allFilters.slice(0, numFilters).map((filter, index) => {
      return {
        cutoffX: mapFromFrequency(filter.cutoff, width),
        controlPointY: getControlPointY(
          filter.type,
          filter.cutoff,
          filter.resonance,
          filter.gain,
          height,
        ),
        index,
      };
    });
  }, [allFilters, numFilters, width, height]);

  // Select appropriate frequency markers based on component width
  const getFrequencyMarks = () => {
    if (width < 100) return frequencyMarkSets.xs;
    if (width < 150) return frequencyMarkSets.sm;
    if (width < 200) return frequencyMarkSets.md;
    if (width < 300) return frequencyMarkSets.lg;
    return frequencyMarkSets.xl;
  };

  // Select appropriate dB markers based on component height
  const getDbMarks = () => {
    if (height < 80) return dbMarkSets.xs;
    if (height < 120) return dbMarkSets.sm;
    if (height < 150) return dbMarkSets.md;
    return dbMarkSets.lg;
  };

  const frequencyMarks = getFrequencyMarks();
  const dbMarks = getDbMarks();

  // Setup window-level event listeners for mouse tracking
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging || isLocked) return;

      const svgElement = document.getElementById(`filtergraph-${custom.id}`);
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();

      // Calculate position relative to SVG, but allow movement outside
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Allow moving throughout the entire SVG height
      // But constrain to valid parameter ranges for calculations
      const xConstrained = Math.max(0, Math.min(width, x));
      const yConstrained = Math.max(0, Math.min(height, y));

      // Update cutoff frequency based on x position
      const newCutoff = mapToFrequency(xConstrained, width);

      let newParams = { ...filterParams };

      // Update cutoff in all cases
      newParams.cutoff = Math.max(20, Math.min(20000, newCutoff));

      // For peak and shelf filters, y directly controls gain
      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        // Map y position directly to dB
        const newDb = mapToDb(yConstrained, height);
        newParams.gain = Math.max(-40, Math.min(20, newDb));
      } else {
        // For other filters, map y position directly to resonance value
        // Map from top (max resonance) to bottom (min resonance)
        const resonanceMin = 0.1;
        const resonanceMax = 20;
        // Calculate percentage from top (0) to bottom (1)
        const yPercent = yConstrained / height;
        // Invert so top = max, bottom = min
        const resonanceValue = resonanceMax - yPercent * (resonanceMax - resonanceMin);
        newParams.resonance = resonanceValue;
      }

      // Update internal state
      setFilterParams(newParams);

      // Send parameters to the node with active filter index
      custom.setCutoff(newParams.cutoff, activeFilterIndex);
      custom.setResonance(newParams.resonance, activeFilterIndex);

      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        custom.setGain(newParams.gain, activeFilterIndex);
      }

      // Output message with updated parameter and filter index
      objectNode.receive(objectNode.inlets[0], ["cutoff", newParams.cutoff, activeFilterIndex]);
      objectNode.receive(objectNode.inlets[0], [
        "resonance",
        newParams.resonance,
        activeFilterIndex,
      ]);

      if (["peak", "lowshelf", "highshelf"].includes(filterParams.type)) {
        objectNode.receive(objectNode.inlets[0], ["gain", newParams.gain, activeFilterIndex]);
      }
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    // Add window-level event listeners when dragging starts
    if (isDragging) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    }

    // Clean up event listeners
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, isLocked, filterParams, custom, objectNode, width, height]);

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;

    const svgElement = e.currentTarget;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find the closest control point from all filters
    let closestDistance = Infinity;
    let closestFilterIndex = -1;

    filterPositions.forEach(({ cutoffX, controlPointY, index }) => {
      const distance = Math.sqrt(Math.pow(x - cutoffX, 2) + Math.pow(y - controlPointY, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestFilterIndex = index;
      }
    });

    // If we found a close enough filter point, start dragging it
    if (closestDistance < 10 && closestFilterIndex >= 0) {
      // Set this filter as active
      setActiveFilterIndex(closestFilterIndex);
      custom.setActiveFilter(closestFilterIndex);

      // Update UI state for the dragging operation
      setIsDragging(true);
      setDragStart({ x, y });

      // Update the filter params to reflect the active filter
      setFilterParams({
        type: allFilters[closestFilterIndex].type,
        cutoff: allFilters[closestFilterIndex].cutoff,
        resonance: allFilters[closestFilterIndex].resonance,
        gain: allFilters[closestFilterIndex].gain,
        filterIndex: closestFilterIndex,
      });
    }
  };

  // Handle double click to cycle through filter types
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isLocked) return;

    // Cycle through filter types for the active filter
    const filterTypes: FilterType[] = [
      "lowpass",
      "highpass",
      "bandpass",
      "notch",
      "peak",
      "lowshelf",
      "highshelf",
    ];

    const currentIndex = filterTypes.indexOf(filterParams.type);
    const nextIndex = (currentIndex + 1) % filterTypes.length;
    const newType = filterTypes[nextIndex];

    // Update the filter type for the active filter
    custom.setFilterType(newType, activeFilterIndex);

    // Send the type message with filter index
    objectNode.receive(objectNode.inlets[0], ["type", newType, activeFilterIndex]);
  };

  // Handle filter selection by click
  const handleClick = (filterIndex: number) => {
    if (isLocked) return;

    // Set the clicked filter as active
    setActiveFilterIndex(filterIndex);
    custom.setActiveFilter(filterIndex);

    // Send the active filter message
    objectNode.receive(objectNode.inlets[0], ["activeFilter", filterIndex]);
  };

  // Helper to format frequency labels
  const formatFrequencyLabel = (freq: number) => {
    if (freq >= 1000) {
      return `${freq / 1000}k`;
    }
    return freq.toString();
  };

  // Helper to get colors for each filter (main color and variations)
  const getFilterColor = (index: number) => {
    const baseColors = [
      objectNode.attributes.curveColor || "#ff9500", // Orange (primary)
      "#00b4ff", // Blue
      "#00ff7f", // Green
      "#ff3377", // Pink
      "#bbbb00", // Yellow
      "#cc44ff", // Purple
      "#ff5533", // Red-orange
      "#33cccc", // Teal
    ];

    // Use the base color if available, otherwise cycle
    const baseColor = baseColors[index % baseColors.length];

    // Make the inactive filters more transparent
    const opacity = index === activeFilterIndex ? 1.0 : 0.4;

    return {
      stroke: baseColor,
      shadow: `drop-shadow(0 0 2px ${baseColor}99)`,
      opacity,
    };
  };

  return (
    <svg
      id={`filtergraph-${custom.id}`}
      width={width}
      height={height}
      style={{
        cursor: isLocked ? "default" : isDragging ? "grabbing" : "pointer",
        userSelect: "none",
        touchAction: "none", // Prevent scrolling while interacting
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Background */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        fill={objectNode.attributes["backgroundColor"] || "#303030"}
      />

      {/* Grid lines */}
      {frequencyMarks.map((freq) => {
        const x = mapFromFrequency(freq, width);

        // Format frequency labels, adapting for size
        const formatLabel = () => {
          // For very small widths, use minimal labels
          if (width < 120) {
            if (freq === 20) return "20";
            if (freq === 1000) return "1k";
            if (freq >= 10000) return "20k";
            return "";
          }

          // For normal sizes, use standard formatting
          if (freq >= 1000) {
            return `${freq / 1000}k`;
          }
          return freq.toString();
        };

        return (
          <g key={`freq-${freq}`}>
            <line
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={objectNode.attributes["gridColor"] || "#666666"}
              strokeWidth="0.5"
            />
            <text
              x={x}
              y={height - 2}
              fill={objectNode.attributes["textColor"] || "#ffffff"}
              fontSize={width < 150 ? "6px" : "8px"}
              textAnchor="middle"
            >
              {formatLabel()}
            </text>
          </g>
        );
      })}

      {/* dB grid lines */}
      {dbMarks.map((db) => {
        const y = mapFromDb(db, height);

        // Only show a subset of labels based on height to avoid crowding
        const showLabel = () => {
          if (height < 80) return db === 0; // Only show 0dB for very small heights
          if (height < 120) return db === -40 || db === 0 || db === 20; // Only show extremes and center for small heights
          return true; // Show all for larger heights
        };

        return (
          <g key={`db-${db}`}>
            <line
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={objectNode.attributes["gridColor"] || "#666666"}
              strokeWidth="0.5"
            />
            {showLabel() && (
              <text
                x={width < 150 ? 15 : 25}
                y={y + 3}
                fill={objectNode.attributes["textColor"] || "#ffffff"}
                fontSize={height < 150 ? "6px" : "8px"}
                textAnchor="right"
              >
                {db}dB
              </text>
            )}
          </g>
        );
      })}

      {/* Render all filter response curves */}
      {responsePathsData.map(({ path, filter, index }) => {
        const color = getFilterColor(index);
        return (
          <path
            key={`filter-${index}`}
            d={path}
            stroke={color.stroke}
            strokeWidth="2"
            opacity={color.opacity}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={color.shadow}
          />
        );
      })}

      {/* Render all cutoff frequency indicator lines and control points */}
      {filterPositions.map(({ cutoffX, controlPointY, index }) => {
        const color = getFilterColor(index);
        const isActive = index === activeFilterIndex;

        return (
          <g key={`control-${index}`}>
            {/* Cutoff frequency indicator line */}
            <line
              x1={cutoffX}
              y1={0}
              x2={cutoffX}
              y2={height}
              stroke={color.stroke}
              strokeWidth={isActive ? "1" : "0.5"}
              strokeDasharray="2,2"
              opacity={color.opacity}
            />

            {/* Control point */}
            <circle
              cx={cutoffX}
              cy={controlPointY}
              r={isActive ? 5 : 4}
              fill={color.stroke}
              strokeWidth={isActive ? 2 : 0}
              stroke="#ffffff"
              opacity={color.opacity}
              onClick={() => handleClick(index)}
            />

            {/* Filter type indicator (shown only for active filter or when hovering) */}
            {isActive && (
              <text x={cutoffX} y={10} fill={color.stroke} fontSize="8px" textAnchor="middle">
                {allFilters[index].type} ({index + 1})
              </text>
            )}
          </g>
        );
      })}

      {/* Display active filters count */}
      <text x={width - 10} y={10} fill="#ffffff" fontSize="8px" textAnchor="end">
        Filters: {numFilters}
      </text>
    </svg>
  );
};

export default FilterGraphSVG;
