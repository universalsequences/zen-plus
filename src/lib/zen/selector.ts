import type { UGen, Arg, Generated } from "./zen";
import type { Context, SIMDContext } from "./context";
import { simdMemo } from "./memo";
import { uuid } from "./uuid";

export const selector = (cond: Arg, ...inputs: Arg[]): UGen => {
  const id = uuid();
  return simdMemo(
    (
      context: Context,
      _cond: Generated,
      ..._inputs: Generated[]
    ): Generated => {
      // Generate code for cond

      // Create a new variable for the result
      const [varName] = context.useCachedVariables(id, "selector");

      // Output code
      const out = `${context.varKeyword} ${varName} = ${_cond.variable} <= 0 ? 0.0 : (${_cond.variable} <= 1 ? ${_inputs[0].variable} : (${_cond.variable} >= ${_inputs.length} ? ${_inputs[_inputs.length - 1].variable} : ${_inputs.map((input, i) => `${_cond.variable} == ${i + 1} ? ${input.variable} : `).join("")} 0.0)); `;
      return context.emit(out, varName, _cond, ..._inputs);
    },
    undefined,
    //(context: SIMDContext, _cond: Generated, ..._inputs: Generated[]): Generated => {
    //
    //},
    cond,
    ...inputs,
  );
};
