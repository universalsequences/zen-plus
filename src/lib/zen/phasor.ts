import { AccumParams, accum } from './accum';
import { UGen, Arg, Generated, float } from './zen'
import { simdMemo } from './memo';
import { div, mult } from './math'
import { Context } from './context';
import { zen_let } from './let';
import { uuid } from './uuid';

const defaults: AccumParams = {
    min: 0,
    max: 1,
};

export const phasor = (
    freq: Arg,
    reset: Arg = 0,
    params: AccumParams = defaults
): UGen => {
    //return simdMemo((context: Context, ): Generated => {
        let range = params.max - params.min;
        return zen_let("phasor",
            accum(
                div(
                    mult(freq, range),
                    44100),
                reset,
                params));
   // },
    //    undefined,
     //   freq,
      //  reset
    //);
};
