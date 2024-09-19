import { useLocked } from "@/contexts/LockedContext";
import type { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import type { ObjectNode } from "@/lib/nodes/types";
import { useCallback, useRef } from "react";
import { interpolateHexColors } from "../Toggle";
import type { Selection } from "./types";
import { usePatches } from "../../../contexts/PatchesContext";
import { usePatch } from "@/contexts/PatchContext";
import { usePatchSelector } from "@/hooks/usePatchSelector";

export const Step: React.FC<{
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

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      selectPatch();
      if (!lockedMode) {
        return;
      }
      down.current = true;
      if (!e.metaKey && step.on) {
        setStepNumberMoving(stepNumber);
        if (!isSelected) {
          setSelectedSteps([step]);
        }
      } else {
        setSelection({
          fromStepNumber: stepNumber,
          toStepNumber: stepNumber,
        });
      }
    },
    [
      lockedMode,
      step,
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
    if (stepEditingDuration !== null) {
      const duration = Math.max(1, stepNumber - stepEditingDuration + 1);
      node.receive(node.inlets[0], {
        name: "duration",
        stepNumber: stepEditingDuration,
        value: duration,
      });
    }
    if (selection) {
      setSelection({
        ...selection,
        toStepNumber: stepNumber,
      });
    } else if (stepNumberMoving !== null && stepNumberMoving !== stepNumber) {
      node.receive(node.inlets[0], {
        fromStepNumber: stepNumberMoving,
        toStepNumber: stepNumber,
        selectedSteps: selectedSteps?.map((x) => x.stepNumber) || [],
      });
      setStepNumberMoving(stepNumber);
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
      node.receive(node.inlets[0], {
        stepNumberToToggle: stepNumber,
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
