import { Arg, genArg, UGen, Generated } from './zen';
import { Context } from './context';
import { add, sub, div, mult } from './math';
import { memo } from './memo';

export const scale = (value: Arg, min1: Arg, max1: Arg, min2: Arg, max2: Arg): UGen => {
    return memo((context: Context): Generated => {
        let _value = context.gen(value);
        let _min1 = context.gen(min1);
        let _min2 = context.gen(min2);
        let _max1 = context.gen(max1);
        let _max2 = context.gen(max2);
        let varIdx = context.idx++;
        let scaleName = `scaleVal${varIdx}`;
        let range1Name = `range1${varIdx}`;
        let range2Name = `range2${varIdx}`;
        let range1 = typeof min1 === "number" && typeof max1 === "number" ?
            max1 - min1 : `${_max1.variable} - ${_min1.variable}`;
        let range2 = typeof min2 === "number" && typeof max2 === "number" ?
            max2 - min2 : `${_max2.variable} - ${_min2.variable}`;

        let code = `${context.varKeyword} ${range1Name} = ${range1};
${context.varKeyword} ${range2Name} = ${range2};
${context.varKeyword} ${scaleName} = ${range1Name} == 0 ? ${_min2.variable} : 
    (((${_value.variable} - ${_min1.variable}) * ${range2Name}) / ${range1Name}) + ${_min2.variable};`;

        return context.emit(code, scaleName, _value, _min1, _max1, _min2, _max2);
    });
};
