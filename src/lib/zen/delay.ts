import { data, peek, poke } from './data';
import { memo } from './memo';
import { Target } from './targets';
import { UGen, Generated, Arg, genArg } from './zen';
import { Context } from './context';
import { accum } from './accum';
import { lerpPeek } from './lerp'

const MAX_SIZE = 4 * 44100; // 4 sec max

export const delay = (input: Arg, delayTime: Arg): UGen => {
    let buf = data(MAX_SIZE + 1, 1);

    return memo((context: Context): Generated => {
        let buffer = buf(context);
        let _input = context.gen(input);
        let _delayTime = context.gen(delayTime);
        let [delayName, indexName, delayIndexName] = context.useVariables(
            "delayVal", "index", "delayIndex");

        let _accum = accum(1, 0, { min: 0, max: MAX_SIZE, exclusive: true })(context);
        let index = `${buffer.idx} + (${_accum.variable})`
        let lerped = lerpPeek(context, buffer, delayIndexName);
        let out = `
// delay code
${_accum.code}
${context.target === Target.C ? "int" : "let"} ${indexName} = ${index};
memory[${indexName}] = ${_input.variable};
${context.target === Target.C ? "double" : "let"} ${delayIndexName} = ${indexName} - ${_delayTime.variable};
if (${delayIndexName} < ${buffer.idx}) {
  ${delayIndexName} += ${MAX_SIZE};
} else if (${delayIndexName} >= ${buffer.idx} + ${buffer.length} - 1) {
  ${delayIndexName} -= ${MAX_SIZE};
}
${lerped.code}
${context.varKeyword} ${delayName} = ${lerped.variable};
`;

        return context.emit(out, delayName, _input, _delayTime);
    });
};
