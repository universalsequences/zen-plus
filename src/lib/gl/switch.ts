import { Context, Arg, UGen, Generated, GLType } from './types';
import { memo } from './memo';
import { emitType } from './context';

export const zswitch = (condition: Arg, a: Arg, b: Arg): UGen => {
    return memo((context: Context): Generated => {
        let _condition = context.gen(condition);
        let _a = context.gen(a);
        let _b = context.gen(b);

        let [switchVar] = context.useVariables("switch_val");

        // determine the type based on the arguments to switch
        let _type = emitType([_a, _b]);
        let type = context.printType(_type);
        let code = `
${type} ${switchVar} = ${_condition.variable} ? ${_a.variable} : ${_b.variable};
`;

        return context.emit(
            _type,
            code,
            switchVar,
            _condition,
            _a,
            _b);
    });
};

