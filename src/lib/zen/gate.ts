import { and, lte, gt, mult, sub, div } from './math';
import { memo } from './memo';
import { latch, add, accum, t60, max, s, abs, mix, mstosamps, clamp, Arg, UGen, min, float, Context, Generated, history } from './index';

export const gate = (trig: Arg, dur: Arg, liveGate: Arg, velocity: Arg = 1): UGen => {
    return memo((context: Context) => {
        let latched = latch(1, trig);
        let acc = accum(latched, trig, { min: 0, max: 10000000000 });
        let _gt = gt(latched, 0);
        let _lt = lte(acc, dur);
        let _anded = and(_gt, _lt);
        // trig acts as velocity
        let _sum = mult(velocity, add(_anded, liveGate));
        return _sum(context);
    });
};


