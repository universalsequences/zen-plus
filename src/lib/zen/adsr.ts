import { UGen, Generated, Arg } from './zen';
import { MemoryBlock } from './block'
import { Context } from './context';
import { print, float } from './index';
import { history, History } from './history';
import { accum } from './accum';
import { lt } from './compare';
import { zswitch, zswitch_inline_then } from './switch';
import { s } from './seq';
import { scale } from './scale';
import { add, sub, and, or, gt, div, mult, clamp, pow } from './math';

export const adsr = (
    trig: Arg,
    attack: Arg = 10000,
    decay: Arg = 10000,
    sustain: Arg = .8,
    release: Arg = 10000,
    duration: Arg = 4000
): UGen => {

    return (context: Context): Generated => {
        let _trig = context.gen(trig);
        let a = context.gen(attack);
        let d = context.gen(decay);
        let s = context.gen(sustain);
        let r = context.gen(release);
        let dur = context.gen(duration);

        let adsrBlock: MemoryBlock = context.alloc(1);
        let counterBlock: MemoryBlock = context.alloc(1);
        let delayedTrig: MemoryBlock = context.alloc(1);
        let isCanceling: MemoryBlock = context.alloc(1);

        let [trigger, adsrVal, counter] = context
            .useVariables('trigger', 'adsrVal', 'counter');

        // when trig is received we start counting
        let out = `
let ${trigger} = ${_trig.variable} || memory[${delayedTrig.idx}];
if (${trigger} && memory[${adsrBlock.idx}] > 0) {
    // we are mid way thru
    // we need to decrease
    // we want to cancel it in 2 ms ~ 100 samples
    memory[${isCanceling.idx}] = memory[${adsrBlock.idx}]/300;
}

let ${adsrVal} = 0;
if (memory[${isCanceling.idx}] > 0) {
  ${adsrVal} = memory[${adsrBlock.idx}] - memory[${isCanceling.idx}];
  if (${adsrVal} <= 0) {
    memory[${isCanceling.idx}] = 0;
    memory[${delayedTrig.idx}] = 1;
  }
} else { 
    let ${counter} = ${trigger} > 0 ? 0 : memory[${counterBlock.idx}];
    memory[${counterBlock.idx}] = ${counter} + 1;

    if (memory[${delayedTrig.idx}] > 0) {
       memory[${delayedTrig.idx}] = 0;
    }
    
    if (${counter} > ${dur.variable} && ${counter} < ${dur.variable} + ${r.variable}) {
        // release
        let releaseCounter = ${counter} - ${dur.variable};
        let releaseRatio = releaseCounter / ${r.variable};
        ${adsrVal} = ${s.variable}* (1 - releaseRatio);
    }else if (${counter} <${a.variable}) {
        // attack 
        ${adsrVal} = ${counter} / ${a.variable};
    } else if (${counter} <${a.variable} + ${d.variable}) {
        // decay
        let decayCounter = ${counter} - ${a.variable};
        let decayRatio = decayCounter / ${d.variable};
        // lerp between 1  and sustain
        ${adsrVal} = 1 * (1 - decayRatio) + decayRatio * ${s.variable};
    } else if (${counter} <${dur.variable}) {
        // sustain
        ${adsrVal} = ${s.variable};
    } //else if (${counter} < ${dur.variable} + ${r.variable}) {
   // }
}
memory[${adsrBlock.idx}] = ${adsrVal};
`;
        return context.emit(out, adsrVal, _trig, a, d, s, r, dur);
    }
}
