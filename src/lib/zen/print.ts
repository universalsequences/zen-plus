import { Arg, UGen, Generated } from './zen';
import { memo } from './memo';
import { Context } from './context'

export const print = (...inputs: Arg[]): UGen => {
    return (context: Context): Generated => {
        let generated = inputs.map(x => context.gen(x));
        let code = `
console.log(${generated.map(x => x.variable).join(',')});
        `;

        return context.emit(code, generated[0].variable!, ...generated);
    };
};
