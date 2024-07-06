import { mult, add, sub, div } from '../math';
import { simdMemo } from '../memo';
import { zen_let } from '../let';
import { t60, max, s, abs, mix, mstosamps, clamp, Arg, UGen, min, float, Context, Generated, history } from '../index';
import { samplerate } from './zdf';


export const onepole = (in1: Arg, cutoff: Arg): UGen => {
    //return simdMemo((context: Context) => {
    const hist = history();
    const m = mix(in1, hist(), cutoff);
    //return zen_let('onepole', hist(m)); //(context);
    //return zen_let('onepole', hist(m)); //(context);
    return zen_let('onepole', s(
        hist(m),
        m)); //(context);
    //}, undefined, in1, cutoff);
};

export const vactrol = (control: Arg, rise: Arg, fall: Arg): UGen => {
    let z60 = t60(max(1, mstosamps(mix(fall, rise, control))));
    return zen_let("vactrol", onepole(control, z60));
};

