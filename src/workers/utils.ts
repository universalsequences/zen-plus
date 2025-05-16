import { VMEvaluation } from "./vm/VM";

export const mergeEvaluation = (a: VMEvaluation, b: VMEvaluation): VMEvaluation => {
  //a.instructionsEvaluated.push(...b.instructionsEvaluated);
  a.replaceMessages.push(...b.replaceMessages);
  //a.objectsEvaluated = []; // Reset as per original
  a.mainThreadInstructions.push(...b.mainThreadInstructions);
  a.optimizedMainThreadInstructions.push(...b.optimizedMainThreadInstructions);
  a.onNewValue.push(...b.onNewValue);
  a.onNewValues.push(...b.onNewValues);
  a.onNewSharedBuffer.push(...b.onNewSharedBuffer);
  a.attributeUpdates.push(...b.attributeUpdates);
  a.onNewStepSchema.push(...b.onNewStepSchema);
  a.mutableValueChanged.push(...b.mutableValueChanged);
  return a;
};
