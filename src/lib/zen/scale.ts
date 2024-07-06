import { Arg, genArg, UGen, Generated } from './zen';
import { Target } from './targets';
import { Context } from './context';
import { add, sub, div, mult } from './math';
import { simdMemo } from './memo';
import { uuid } from './uuid';

/*
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
*/

export const scale = (value: Arg, min1: Arg, max1: Arg, min2: Arg, max2: Arg, exponent: Arg = 1): UGen => {
    let id = uuid();
    return simdMemo((context: Context, _value: Generated, _min1: Generated, _max1: Generated, _min2: Generated, _max2: Generated, _exponent: Generated): Generated => {
        let [scaleName, range1Name, range2Name, normValName] = context.useCachedVariables(id, "scaleVal", "range1", "range2", "normVal");

        let range1 = typeof min1 === "number" && typeof max1 === "number" ?
            max1 - min1 : `${_max1.variable} - ${_min1.variable}`;
        let range2 = typeof min2 === "number" && typeof max2 === "number" ?
            max2 - min2 : `${_max2.variable} - ${_min2.variable}`;

        let pow = context.target === Target.C ? "pow" : "Math.pow";

        let code = `${context.varKeyword} ${range1Name} = ${range1};
${context.varKeyword} ${range2Name} = ${range2};
${context.varKeyword} ${normValName} = ${range1Name} == 0 ? 0 :
    (${_value.variable} - ${_min1.variable}) / ${range1Name};
${context.varKeyword} ${scaleName} = ${_min2.variable} + ${range2Name} * ${pow}(${normValName}, ${_exponent.variable});`;

        return context.emit(code, scaleName, _value, _min1, _max1, _min2, _max2, _exponent);
    },
        undefined,
        value,
        min1,
        max1,
        min2,
        max2,
        exponent
    );
};

