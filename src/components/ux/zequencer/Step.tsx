import { useLocked } from "@/contexts/LockedContext";
import type { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import type { ObjectNode } from "@/lib/nodes/types";
import { useCallback, useRef, memo, useEffect } from "react";
import { interpolateHexColors } from "../Toggle";
import type { Selection } from "./types";
import { usePatches } from "../../../contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import { usePatchSelector } from "@/hooks/usePatchSelector";

const StepComponent: React.FC<{
  isMini: boolean;
  selectedSteps: GenericStepData[] | null;
  isSelected: boolean;
  selection: Selection | null;
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>;
  setStepNumberMoving: React.Dispatch<React.SetStateAction<number | null>>;
  stepNumberMoving: number | null;
  stepBaseColor: string;
  stepMoved: boolean;
  setStepMoved: React.Dispatch<React.SetStateAction<boolean>>;
  onColor: string;
  offColor: string;
  stepNumber: number;
  node: ObjectNode;
  step: GenericStepData;
  isDurationStep: boolean;
  stepEditingDuration: number | null;
  setStepEditingDuration: React.Dispatch<React.SetStateAction<number | null>>;
  setSelectedSteps: React.Dispatch<React.SetStateAction<GenericStepData[] | null>>;
}> = ({
  setSelectedSteps,
  isDurationStep,
  step,
  isSelected,
  selectedSteps,
  stepNumber,
  node,
  onColor,
  offColor,
  stepBaseColor,
  setStepNumberMoving,
  stepNumberMoving,
  stepMoved,
  setStepMoved,
  selection,
  isMini,
  setSelection,
  stepEditingDuration,
  setStepEditingDuration,
}) => {
  const { lockedMode } = useLocked();
  const down = useRef(false);
  const { selectPatch } = usePatchSelector();
  
  // Add throttling to prevent excessive calls
  const lastMouseOverTime = useRef(0);
  const pendingTimeouts = useRef<NodeJS.Timeout[]>([]);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pendingTimeouts.current = [];
    };
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      selectPatch();
      if (!lockedMode) {
        return;
      }

      down.current = true;

      // If the user is starting a drag operation (not a selection with metaKey)
      if (
        !e.metaKey &&
        (step.on || (node.steps && node.steps[stepNumber] && node.steps[stepNumber].length > 0))
      ) {
        // Check if this step exists in node.steps
        const currentStepVoices = node.steps?.[stepNumber];

        // First, search for this exact step by ID in the voices array
        const exactStep = currentStepVoices?.find(voice => voice.id === step.id);
        
        // If the exact step is found, use it, otherwise fall back to the first voice or provided step
        const currentStep = exactStep || 
          (currentStepVoices && currentStepVoices.length > 0 ? currentStepVoices[0] : step);

        // Set the stepNumber to track for movement
        setStepNumberMoving(stepNumber);

        // Select this step if it's not already selected
        if (!isSelected) {
          setSelectedSteps([currentStep]);
        }
      } else {
        // Starting a selection
        setSelection({
          fromStepNumber: stepNumber,
          toStepNumber: stepNumber,
        });
      }
    },
    [
      lockedMode,
      step,
      node,
      selectPatch,
      setStepNumberMoving,
      setSelection,
      stepNumber,
      isSelected,
      setSelectedSteps,
    ],
  );

  const onMouseOver = useCallback(() => {
    if (!lockedMode) {
      return;
    }
    
    // Throttle mouse over events to max 60fps (16ms)
    const now = Date.now();
    if (now - lastMouseOverTime.current < 16) {
      return;
    }
    lastMouseOverTime.current = now;
    
    if (stepEditingDuration !== null) {
      const duration = Math.max(1, stepNumber - stepEditingDuration + 1);
      
      // Clear any pending timeouts to prevent queue buildup
      pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pendingTimeouts.current = [];
      
      // Get all steps at the editing position
      const stepVoices = node.steps?.[stepEditingDuration];
      
      if (stepVoices && stepVoices.length > 0) {
        // Find all active steps (ON) at this position
        const activeSteps = stepVoices.filter(voice => voice.on);
        
        if (activeSteps.length > 0) {
          // Batch all operations into a single message to reduce overhead
          node.receive(node.inlets[0], {
            name: "duration",
            stepNumber: stepEditingDuration,
            value: duration,
            stepIds: activeSteps.map(step => step.id) // Send all IDs at once
          });
        } else {
          // Fall back to editing the first voice if no active steps are found
          node.receive(node.inlets[0], {
            name: "duration",
            stepNumber: stepEditingDuration,
            value: duration,
            voiceIndex: 0
          });
        }
      }
    }
    if (selection) {
      setSelection({
        ...selection,
        toStepNumber: stepNumber,
      });
    } else if (stepNumberMoving !== null && stepNumberMoving !== stepNumber) {
      // Execute the move operation
      node.receive(node.inlets[0], {
        fromStepNumber: stepNumberMoving,
        toStepNumber: stepNumber,
        selectedSteps: selectedSteps?.map((x) => x.stepNumber) || [],
      });

      // Update the step being moved to the new position
      setStepNumberMoving(stepNumber);

      // Clear any existing timeouts to prevent queue buildup
      pendingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pendingTimeouts.current = [];

      // Use a single timeout with proper cleanup
      const timeout = setTimeout(() => {
        // Get the step at the new position after the move operation
        const updatedSteps = node.steps;
        if (updatedSteps && updatedSteps[stepNumber] && updatedSteps[stepNumber].length > 0) {
          const newStep = updatedSteps[stepNumber][0]; // Always use the first voice
          if (newStep && newStep.on) {
            setSelectedSteps([newStep]);
          }
        }
        // Remove this timeout from pending list
        pendingTimeouts.current = pendingTimeouts.current.filter(t => t !== timeout);
      }, 20);
      
      pendingTimeouts.current.push(timeout);
      setStepMoved(true);
    }
  }, [
    lockedMode,
    stepEditingDuration,
    selectedSteps,
    node,
    setSelection,
    stepNumberMoving,
    selection,
    stepNumber,
    setStepNumberMoving,
    setStepMoved,
    setSelectedSteps,
  ]);

  const toggle = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!lockedMode || !down.current) {
        return;
      }

      down.current = false;
      if (stepEditingDuration !== null) {
        return;
      }
      if (stepMoved || selection?.fromStepNumber !== selection?.toStepNumber) {
        setStepNumberMoving(null);
        setStepMoved(false);
        return;
      }

      if (e.metaKey) {
        return;
      }
      if (step.on) {
        setSelectedSteps([]);
      }

      // If this is an actual step with an ID and it's currently ON, toggle it OFF
      if (step.id && step.on) {
        // First check if there's a matching step in the voices at this position
        const stepVoices = node.steps?.[stepNumber];
        const matchingStep = stepVoices?.find(v => v.id === step.id);
        
        if (matchingStep) {
          // Delete this specific step (since we're toggling it off)
          node.receive(node.inlets[0], {
            stepsToDelete: [],
            stepIdsToDelete: [step.id]
          });
          return;
        }
      }
      
      // For OFF -> ON toggling or if no matching step found, use the regular toggle operation
      node.receive(node.inlets[0], {
        stepNumberToToggle: stepNumber,
        voiceIndex: 0,
      });
    },
    [
      isSelected,
      stepEditingDuration,
      selection,
      setStepMoved,
      setStepNumberMoving,
      stepMoved,
      lockedMode,
      node,
      stepNumber,
      step,
      setSelectedSteps
    ],
  );
  const isInSelection =
    selection && stepNumber >= selection.fromStepNumber && stepNumber <= selection.toStepNumber;

  const primaryColor = step.on ? onColor : offColor;
  const secondaryColor = isInSelection
    ? interpolateHexColors(stepBaseColor, "#ffffff", 0.8)
    : stepNumber % 4 === 0
      ? interpolateHexColors(stepBaseColor, "#ffffff", 0.3)
      : stepBaseColor;
  return (
    <div
      style={{
        backgroundColor: isDurationStep
          ? interpolateHexColors(onColor, "#000000", 0.5)
          : "transparent",
      }}
      onMouseUp={toggle}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onFocus={() => 0}
      onKeyDown={(e: any) => 0}
      className={`w-full ${isMini ? "h-5" : "h-full"} flex relative`}
    >
      <div
        style={{
          borderColor: isSelected ? onColor : secondaryColor,
          backgroundColor: isSelected
            ? interpolateHexColors(primaryColor, "#000000", 0.3)
            : primaryColor,
        }}
        className={`overflow-hidden relative flex w-3/4 h-2/3 m-auto border-2 cursor-pointer ${lockedMode ? " " : ""} rounded-full`}
      />
      <div
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
          setStepEditingDuration(stepNumber);
        }}
        className="h-full w-1 z-30 absolute right-0 cursor-ew-resize "
      />
    </div>
  );
};

export const Step = memo(StepComponent, (prevProps, nextProps) => {
  // Custom comparison for Step component
  return (
    prevProps.step.id === nextProps.step.id &&
    prevProps.step.on === nextProps.step.on &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDurationStep === nextProps.isDurationStep &&
    prevProps.stepEditingDuration === nextProps.stepEditingDuration &&
    prevProps.stepNumberMoving === nextProps.stepNumberMoving &&
    prevProps.selection === nextProps.selection &&
    prevProps.stepMoved === nextProps.stepMoved &&
    prevProps.isMini === nextProps.isMini
  );
});
