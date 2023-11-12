import { UGen, Arg, Generated, float } from './zen'
import { phasor } from './phasor';
import { memo } from './memo';
import { Context } from './context';
import { add, wrap } from './math';
import { Target } from './targets';
import { cKeywords } from './math';

const SINE_TABLE_SIZE = 1024;

export const cycle = (
    freq: Arg,
    phase: Arg = 0
): UGen => {
    return memo((context: Context): Generated => {
        let _freq = context.gen(freq);
        let _phase = context.gen(phase);
        let cyclePhase = wrap(
            add(
                phasor(freq),
                phase),
            0, 1)(context);

        let [
            floatIndex,
            frac,
            lerp,
            index,
            nextIndex] = context.useVariables(
                "floatIndex", "frac", "clerp", "index", "nextIndex");

        const SINE_TABLE = context.target === Target.C ? "sineTable" : "this.sineTable";
        let intKeyword = context.intKeyword;
        let varKeyword = context.varKeyword;
        let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
        let out = `
${cyclePhase.code}
${context.varKeyword} ${floatIndex} = ${cyclePhase.variable} * ${SINE_TABLE_SIZE};
${context.varKeyword} ${frac} = ${floatIndex} - ${floor}(${floatIndex});
${intKeyword} ${index} = ${floor}(${floatIndex});
${intKeyword} ${nextIndex} = ${index} + 1;
if (${nextIndex} >= ${SINE_TABLE_SIZE}) {
  ${nextIndex} = 0;
}
${varKeyword} ${lerp} = (1.0-${frac})*${SINE_TABLE}[${index}] + ${frac}*${SINE_TABLE}[${nextIndex}];
`;
        return context.emit(out, lerp, _freq, _phase);
    });
};
