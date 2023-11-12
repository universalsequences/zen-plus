import { UGen, Arg, genArg, Generated, float } from './zen';
import { Context } from './context';
import { memo } from './memo';

export const selector = (cond: Arg, ...inputs: Arg[]): UGen => {
    return memo((context: Context): Generated => {
        // Generate code for cond
        let _cond = context.gen(cond);

        // Generate code for inputs
        let _inputs = inputs.map(input => context.gen(input));

        // Create a new variable for the result
        let [varName] = context.useVariables("selector");

        // Output code
        let out = `${context.varKeyword} ${varName} = ${_cond.variable} <= 0 ? 0.0 : (${_cond.variable} <= 1 ? ${_inputs[0].variable} : (${_cond.variable} >= ${_inputs.length} ? ${_inputs[_inputs.length - 1].variable} : ${_inputs.map((input, i) => `${_cond.variable} == ${i + 1} ? ${input.variable} : `).join('')} 0.0));`;
        let r = context.emit(out, varName, _cond, ..._inputs);
        return r;
    });
};
