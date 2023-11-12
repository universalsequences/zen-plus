import { mult, add, sub, div } from '../math';
import { memo } from '../memo';
import { zen_let } from '../let';
import { t60, max, s, abs, mix, mstosamps, clamp, Arg, UGen, min, float, Context, Generated, history } from '../index';
import { samplerate } from './zdf';


export const onepole = (in1: Arg, cutoff: Arg): UGen => {
    return memo((context: Context) => {
        const hist = history();

        const m = mix(in1, hist(), cutoff);
        return zen_let('onepole', hist(m))(context);
    });
};

export const vactrol = (control: Arg, rise: Arg, fall: Arg): UGen => {
    return memo((context: Context) => {
        let z60 = t60(max(1, mstosamps(mix(fall, rise, control))));
        return zen_let("vactrol", onepole(control, z60))(context);
    });
};

