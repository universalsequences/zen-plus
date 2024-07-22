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
  steps: GenericStepData[],
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

  // Collect steps to be moved and remove them from their original positions
  const movedSteps = steps.slice();
  const stepsBeingMoved: GenericStepData[] = [];
  for (const stepNumber of stepsToMove) {
    stepsBeingMoved.push(movedSteps[stepNumber]);
    movedSteps[stepNumber] = getDefaultStep(stepNumber, userDefinedSchema);
  }

  // Insert moved steps into their new positions
  for (let i = 0; i < stepsToMove.length; i++) {
    const originalStepNumber = stepsToMove[i];
    const newStepNumber = originalStepNumber + moveOffset;
    const stepToInsert = stepsBeingMoved[i];

    // Ensure we're not inserting out of bounds
    if (newStepNumber >= 0 && newStepNumber < movedSteps.length) {
      movedSteps[newStepNumber] = stepToInsert;
      stepToInsert.stepNumber = newStepNumber;
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
      if (
        !stepsToMove.includes(i - moveOffset) &&
        movedSteps[i].stepNumber !== i
      ) {
        movedSteps[i].stepNumber = i;
      }
    }
  }

  return { steps: movedSteps, schema: userDefinedSchema };
};
