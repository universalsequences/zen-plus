import { UGen, Arg, Generated, float } from './zen'
import { uuid } from './uuid';
import { phasor } from './phasor';
import { simdMemo } from './memo-simd';
import { Context } from './context';
import { add, wrap, mult, sub, floor } from './math';
import { Target } from './targets';
import { cKeywords } from './math';

const SINE_TABLE_SIZE = 1024;

export const cycleHelper = (index: Arg, nextIndex: Arg, frac: Arg) => {
    let id = uuid();
    return simdMemo((context: Context, _index: Generated, _nextIndex: Generated, _frac: Generated) => {
        let [
            floatIndex,
            frac,
            lerp,
            index,
            nextIndex] = context.useCachedVariables(id,
                "floatIndex", "frac", "clerp", "index", "nextIndex");

        const SINE_TABLE = context.target === Target.C ? "sineTable" : "this.sineTable";
        let intKeyword = context.intKeyword;
        let varKeyword = context.varKeyword;
        let caster = context.target === Target.C ? "(int)" : "";
        let out = `
${varKeyword} ${lerp} = (1.0-${_frac.variable})*${SINE_TABLE}[${caster} ${_index.variable}] + ${_frac.variable}*${SINE_TABLE}[${caster} ${_nextIndex.variable}];
`;
        return context.emit(out, lerp, _index, _nextIndex, _frac);
    },
        undefined,
        index,
        nextIndex,
        frac);
};

export const cycle = (
    freq: Arg,
    phase: Arg = 0
): UGen => {

    let cyclePhase = wrap(
        add(
            phasor(freq),
            phase),
        0, 1);

    let floatIndex = mult(cyclePhase, SINE_TABLE_SIZE);
    let index = floor(floatIndex);
    let frac = sub(floatIndex, index);
    let nextIndex = wrap(add(index, 1), 0, SINE_TABLE_SIZE);
    return cycleHelper(index, nextIndex, frac);
};
