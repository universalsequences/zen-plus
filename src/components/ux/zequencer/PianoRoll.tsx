import React, { useMemo } from "react";
import type { ObjectNode } from "@/lib/nodes/types";
import type { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import { interpolateHexColors } from "../Toggle";
import { useStepsContext } from "@/contexts/StepsContext";
import { useLocked } from "@/contexts/LockedContext";

interface PianoRollProps {
  objectNode: ObjectNode;
  node: ObjectNode;
  pianoRollHeight: number;
  onStepClick: (step: GenericStepData) => void;
  schema?: StepDataSchema;
  currentStepNumber?: number; // Add current step number prop
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  objectNode,
  node,
  pianoRollHeight,
  onStepClick,
  schema,
  currentStepNumber = 0, // Default to 0 if not provided
}) => {
  const { selectedSteps } = useStepsContext();
  const { lockedMode } = useLocked();

  // Get all polyphonic steps as a flat array
  const allSteps = useMemo(() => {
    if (!node?.steps) return [];

    // Flatten all steps with their voice information
    const flatSteps: GenericStepData[] = [];

    for (let i = 0; i < node.steps.length; i++) {
      const voices = node.steps[i];
      if (voices && voices.length > 0) {
        for (const voice of voices) {
          // Include all steps that are ON, even if they have negative values
          if (voice.on) {
            flatSteps.push({ ...voice });
          }
        }
      }
    }

    return flatSteps;
  }, [node?.steps]);

  // Find the pitch/frequency field
  const pitchField = useMemo(() => {
    if (!allSteps.length) return null;

    // Check common names for pitch in priority order
    const commonPitchFields = ["semitone", "transpose", "frequency", "note", "pitch"];

    for (const field of commonPitchFields) {
      if (field in allSteps[0]) {
        return field;
      }
    }

    return null;
  }, [allSteps]);

  // Find pitch range for vertical scaling
  const pitchRange = useMemo(() => {
    if (!pitchField || !allSteps.length) return { min: 0, max: 12 };

    let min = Infinity;
    let max = -Infinity;

    for (const step of allSteps) {
      const pitch = step[pitchField] as number;
      if (typeof pitch === "number") {
        min = Math.min(min, pitch);
        max = Math.max(max, pitch);
      }
    }

    // If we didn't find any valid values or only found one, default to a reasonable range
    if (min === Infinity || max === -Infinity) {
      return { min: 0, max: 12 };
    }

    // If we only found one value or min equals max, create a range around it
    if (min === max) {
      // For a single value, create a range that includes it
      const centerValue = min;
      return { min: centerValue - 6, max: centerValue + 6 };
    }

    // Handle negative values properly - add a buffer on each end
    return {
      min: Math.floor(min - 1),
      max: Math.ceil(max + 1),
    };
  }, [allSteps, pitchField]);

  const totalSteps = node?.steps?.length || 16;
  const stepOnColor = (objectNode.attributes.stepOnColor as string) || "#ffffff";
  const stepOffColor = (objectNode.attributes.stepOffColor as string) || "#000000";

  // Calculate step width based on total width and number of steps
  const stepWidth = 100 / totalSteps;

  // Handler for background click to create a new step
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lockedMode || !node || !pitchField || !schema) return;

    // Get click coordinates relative to the container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to step number and pitch
    const stepNumber = Math.floor((x / rect.width) * totalSteps);

    // Calculate pitch based on vertical position (properly handle negative values)
    const normalizedY = y / rect.height;
    // Ensure pitch calculation works with the full range, including negative values
    const pitch = Math.round(pitchRange.max - normalizedY * (pitchRange.max - pitchRange.min));

    // Validate step number
    if (stepNumber < 0 || stepNumber >= totalSteps) return;

    // Check if there's already a step with this exact pitch at this position
    const stepsAtPosition = node.steps?.[stepNumber] || [];

    // Find an existing ON step with same pitch
    const existingStepWithSamePitch = stepsAtPosition.find(
      (step) => step.on && step[pitchField] === pitch,
    );

    // If there's already a step with this pitch, toggle it off
    if (existingStepWithSamePitch) {
      // Find step IDs to delete
      const stepIdsToDelete = [existingStepWithSamePitch.id];
      node.receive(node.inlets[0], {
        stepsToDelete: [], // Keep for backward compatibility
        stepIdsToDelete,
      });
      return;
    }

    // Check for any OFF steps at this position that should be cleaned up
    const offSteps = stepsAtPosition.filter((step) => !step.on);

    // If there are OFF steps, make note of their IDs to ensure they get cleaned up
    // (this is handled automatically in the addStep operation now)

    // Add a new step with our addStep operation
    node.receive(node.inlets[0], {
      stepNumber,
      pitchField,
      pitchValue: pitch,
    });
  };

  if (pianoRollHeight <= 0) return null;

  return (
    <div
      className="w-full relative bg-black bg-opacity-30 rounded-md overflow-hidden "
      style={{ height: pianoRollHeight }}
      onClick={handleBackgroundClick}
    >
      {/* Background vertical divisions for each semitone with different shades for white/black keys */}
      {pitchRange &&
        Array.from({ length: pitchRange.max - pitchRange.min + 1 }).map((_, i) => {
          // Calculate the actual note number (handling negative numbers properly)
          // For negative numbers, we need to ensure we get positive values for the modulo operation
          const absoluteNoteValue = pitchRange.min + i;
          // Use a formula that works for negative numbers by adding 12 and taking modulo again
          const noteValue = ((absoluteNoteValue % 12) + 12) % 12;

          // Standard piano black key positions
          const isBlackKey = [1, 3, 6, 8, 10].includes(noteValue);

          return (
            <div
              key={`key-${i}`}
              className={`absolute w-full ${isBlackKey ? "bg-gray-800" : "bg-gray-900"}`}
              style={{
                top: `${(1 - i / (pitchRange.max - pitchRange.min)) * 100}%`,
                height: `${100 / (pitchRange.max - pitchRange.min)}%`,
                pointerEvents: "none",
              }}
            />
          );
        })}

      {/* Horizontal grid lines */}
      {pitchRange &&
        Array.from({ length: pitchRange.max - pitchRange.min + 1 }).map((_, i) => (
          <div
            key={`grid-${i}`}
            className="absolute w-full border-t border-gray-800"
            style={{
              top: `${(1 - i / (pitchRange.max - pitchRange.min)) * 100}%`,
              height: 1,
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* Vertical grid lines with alternating shades every 4 steps */}
      {Array.from({ length: totalSteps + 1 }).map((_, i) => {
        // Determine if this is a major beat (every 4 steps)
        const isMajorBeat = i % 4 === 0;

        return (
          <div
            key={`vgrid-${i}`}
            className={`absolute h-full border-l ${isMajorBeat ? "border-gray-500" : "border-gray-800"}`}
            style={{
              left: `${i * stepWidth}%`,
              width: isMajorBeat ? 1 : 1,
              opacity: isMajorBeat ? 0.8 : 0.4,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Add shaded regions for every 4 steps to make patterns more visible */}
      {Array.from({ length: Math.ceil(totalSteps / 4) }).map((_, i) => {
        // Every other group of 4 steps gets a subtle shading
        const isShaded = i % 2 === 1;
        if (!isShaded) return null;

        return (
          <div
            key={`shade-${i}`}
            className="absolute h-full bg-white"
            style={{
              left: `${i * 4 * stepWidth}%`,
              width: `${4 * stepWidth}%`,
              opacity: 0.02,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Add subtle indicators to show the C notes (note 0) for music theory reference */}
      {pitchRange &&
        Array.from({ length: pitchRange.max - pitchRange.min + 1 }).map((_, i) => {
          // Calculate the actual note number (handling negative numbers properly)
          const absoluteNoteValue = pitchRange.min + i;
          const noteValue = ((absoluteNoteValue % 12) + 12) % 12;

          // Only highlight C notes (note 0)
          if (noteValue !== 0) return null;

          return (
            <div
              key={`c-note-${i}`}
              className="absolute left-0 w-full border-t border-blue-600"
              style={{
                top: `${(1 - i / (pitchRange.max - pitchRange.min)) * 100}%`,
                height: 1,
                opacity: 0.3,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          );
        })}

      {/* Current position playhead indicator - main line */}
      {currentStepNumber >= 0 && currentStepNumber < totalSteps && (
        <>
          {/* Main vertical line */}
          <div
            className="absolute h-full"
            style={{
              left: `${(currentStepNumber / totalSteps) * 100}%`,
              width: "2px",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              opacity: 0.8,
              zIndex: 5,
              pointerEvents: "none",
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.7)",
              transition: "left 0.05s ease-out",
            }}
          />

          {/* Top indicator dot */}
          <div
            className="absolute rounded-full"
            style={{
              left: `${(currentStepNumber / totalSteps) * 100}%`,
              top: "0%",
              width: "6px",
              height: "6px",
              backgroundColor: "white",
              opacity: 0.9,
              zIndex: 6,
              transform: "translateX(-2px) translateY(-2px)", // Adjusted to center properly
              pointerEvents: "none",
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.9)",
              transition: "left 0.05s ease-out",
            }}
          />

          {/* Bottom indicator dot */}
          <div
            className="absolute rounded-full"
            style={{
              left: `${(currentStepNumber / totalSteps) * 100}%`,
              bottom: "0%",
              width: "6px",
              height: "6px",
              backgroundColor: "white",
              opacity: 0.9,
              zIndex: 6,
              transform: "translateX(-2px) translateY(2px)", // Adjusted to center properly
              pointerEvents: "none",
              boxShadow: "0 0 4px rgba(255, 255, 255, 0.9)",
              transition: "left 0.05s ease-out",
            }}
          />
        </>
      )}

      {/* Render steps */}
      {pitchField &&
        allSteps.map((step, index) => {
          const pitch = step[pitchField] as number;
          if (typeof pitch !== "number") return null;

          // Calculate position based on step number and pitch
          const left = (step.stepNumber / totalSteps) * 100;

          // Calculate normalized pitch position (handle negative values)
          const pitchRange_height = pitchRange.max - pitchRange.min;
          const normalizedPitch =
            pitchRange_height > 0 ? (pitch - pitchRange.min) / pitchRange_height : 0.5; // Fallback if range is 0

          const top = (1 - normalizedPitch) * 100;

          // Ensure the step is visible within the piano roll
          const clampedTop = Math.max(0, Math.min(100, top));

          // Calculate width based on duration
          const duration = (step.duration as number) || 1;
          const width = (duration / totalSteps) * 100;

          // Check if step is selected
          const isSelected = selectedSteps?.some((s) => s.id === step.id) || false;

          return (
            <div
              key={`step-${step.id}-${index}`}
              className="absolute rounded-sm cursor-pointer"
              style={{
                left: `${left}%`,
                top: `${clampedTop}%`,
                width: `${width}%`,
                height: "8%",
                minHeight: "4px",
                backgroundColor: isSelected
                  ? interpolateHexColors(stepOnColor, "#ffffff", 0.5)
                  : stepOnColor,
                transform: "translateY(-50%)",
                transition: "background-color 0.1s ease",
                border: isSelected ? "1px solid white" : "none",
                boxShadow: "0 0 4px rgba(0, 0, 0, 0.3)",
                zIndex: isSelected ? 10 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the background click handler
                onStepClick(step);
              }}
            />
          );
        })}
    </div>
  );
};
