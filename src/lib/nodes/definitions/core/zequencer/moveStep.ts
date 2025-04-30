import type { Operation } from "./operation";
import { getDefaultStep } from "./setupSchema";
import type {
  FieldSchema,
  GenericStepData,
  MoveStepMessage,
  MoveStepSchema,
  StepDataSchema,
} from "./types";

export const moveStep = (
  move: MoveStepMessage,
  steps: GenericStepData[][],
  userDefinedSchema: StepDataSchema,
) => {
  const { fromStepNumber, toStepNumber, selectedSteps } = move;

  // Determine which steps to move
  const stepsToMove =
    selectedSteps && selectedSteps.length > 0
      ? selectedSteps.sort((a, b) => a - b)
      : [fromStepNumber];

  // Calculate the direction and offset of the move
  const moveOffset = toStepNumber - fromStepNumber;
  const moveDirection = Math.sign(moveOffset);

  // Create a deep copy of the steps array to work with
  const movedSteps = steps.map(stepVoices => [...stepVoices]);
  
  // Collect steps to be moved and remove them from their original positions
  const stepsBeingMoved: GenericStepData[][] = [];
  
  for (const stepNumber of stepsToMove) {
    if (stepNumber >= 0 && stepNumber < movedSteps.length) {
      // Store all voices for this step position
      stepsBeingMoved.push([...movedSteps[stepNumber]]);
      
      // Replace with a default step (single voice)
      movedSteps[stepNumber] = [getDefaultStep(stepNumber, userDefinedSchema)];
    }
  }

  // Insert moved steps into their new positions
  for (let i = 0; i < stepsToMove.length; i++) {
    const originalStepNumber = stepsToMove[i];
    const newStepNumber = originalStepNumber + moveOffset;
    const stepVoicesToInsert = stepsBeingMoved[i];

    // Ensure we're not inserting out of bounds
    if (newStepNumber >= 0 && newStepNumber < movedSteps.length && stepVoicesToInsert) {
      // Update step numbers for all voices
      const updatedVoices = stepVoicesToInsert.map(voice => ({
        ...voice,
        stepNumber: newStepNumber
      }));
      
      // Replace the voices at the target position
      movedSteps[newStepNumber] = updatedVoices;
    }
  }

  // Shift other steps if necessary
  if (moveDirection !== 0) {
    const startShift = Math.min(fromStepNumber, toStepNumber);
    const endShift = Math.max(
      fromStepNumber + stepsToMove.length - 1,
      toStepNumber + stepsToMove.length - 1,
    );

    for (let i = startShift; i <= endShift; i++) {
      if (!stepsToMove.includes(i - moveOffset) && i >= 0 && i < movedSteps.length) {
        // Update step number for all voices at this position
        movedSteps[i] = movedSteps[i].map(voice => ({
          ...voice,
          stepNumber: i
        }));
      }
    }
  }

  return { steps: movedSteps, schema: userDefinedSchema };
};
