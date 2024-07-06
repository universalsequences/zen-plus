import { UGen, Context, Arg, Generated } from './index';
import { simdMemo, } from './memo';
import { uuid } from './uuid';

export const zen_let = (name: string, value: Arg): UGen => {
    let id = uuid();
    return simdMemo((context: Context, _value: Generated): Generated => {
        let [varName] = context.useCachedVariables(id, name);
        //let _value = context.gen(value);
        let code = `${context.varKeyword} ${varName} = ${_value.variable};` + '\n';
        return context.emit(
            code, varName, _value);
    }, undefined, value);
};
