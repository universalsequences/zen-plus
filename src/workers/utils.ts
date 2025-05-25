import { VMEvaluation } from "./vm/VM";
export const mergeEvaluation = (a: VMEvaluation, b: VMEvaluation): VMEvaluation => {
  const safePush = <T>(target: T[], source: T[]) => {
    if (target === source) return; // same array ⇒ nothing to merge

    // capture the original length so we don’t iterate over the new items we’re appending
    for (let i = 0, n = source.length; i < n; i++) {
      target.push(source[i]);
    }
  };

  safePush(a.replaceMessages, b.replaceMessages);
  safePush(a.mainThreadInstructions, b.mainThreadInstructions);
  safePush(a.optimizedMainThreadInstructions, b.optimizedMainThreadInstructions);
  safePush(a.onNewValue, b.onNewValue);
  safePush(a.onNewValues, b.onNewValues);
  safePush(a.onNewSharedBuffer, b.onNewSharedBuffer);
  safePush(a.attributeUpdates, b.attributeUpdates);
  safePush(a.onNewStepSchema, b.onNewStepSchema);
  safePush(a.mutableValueChanged, b.mutableValueChanged);

  return a;
};
