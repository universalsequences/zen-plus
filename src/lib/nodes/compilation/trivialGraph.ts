import type { CompoundOperator, Statement } from "../definitions/zen/types";
export const isTrivialGraph = (statement: Statement) => {
  let numberOfInputs = 0;
  for (const part of (statement as Statement[]).slice(1)) {
    if (!Array.isArray(part)) {
      return -1;
    }
    const [op, arg] = part as Statement[];
    if (!Array.isArray(arg)) {
      return -1;
    }
    const { name, outputNumber } = op as CompoundOperator;
    if (name === "output") {
      const op2 = (arg as Statement[])[0] as CompoundOperator;
      if (op2.name === "input") {
        if ((op2.value as number) > numberOfInputs) {
          numberOfInputs = op2.value as number;
        }
      } else {
        return -1;
      }
    } else {
      return -1;
    }
  }
  return numberOfInputs + 1;
};
