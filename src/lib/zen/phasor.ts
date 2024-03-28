import { AccumParams, accum } from './accum';
import { UGen, Arg, Generated, float } from './zen'
import { memo } from './memo';
import { div, mult } from './math'
import { Context } from './context';
import { zen_let } from './let';

const defaults: AccumParams = {
    min: 0,
    max: 1,
};

export const phasor = (
    freq: Arg,
    reset: Arg = 0,
    params: AccumParams = defaults
): UGen => {
    return memo((context: Context): Generated => {
        let range = params.max - params.min;
        return zen_let("phasor",
            accum(
                div(
                    mult(freq, range),
                    context.sampleRate),
                reset,
                params))(context);
    });
};
