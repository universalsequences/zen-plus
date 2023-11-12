import { UGen, Context, Arg, Generated } from './index';

export const zen_let = (name: string, value: Arg): UGen => {
    return (context: Context): Generated => {
        let [varName] = context.useVariables(name);
        let _value = context.gen(value);
        let code = `${context.varKeyword} ${varName} = ${_value.variable};` + '\n';
        return context.emit(
            code, varName, _value);
    }
};
