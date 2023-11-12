import { UGen, Generated, Arg } from './zen';
import { memo } from './memo';
import { Context } from './context';
import { print, float } from './index';
import { history, History } from './history';
import { accum } from './accum';
import { lt } from './compare';
import { zswitch, zswitch_inline_then } from './switch';
import { s } from './seq';
import { scale } from './scale';
import { add, sub, and, or, gt, div, mult, clamp, pow } from './math';

export const triangle = (ramp: Arg, duty: Arg = 0.5): UGen => {
    return memo((context: Context) => {
        return zswitch(
            lt(ramp, duty),
            scale(ramp, 0, duty, 0, 1),
            scale(ramp, duty, 1, 1, 0))(context);
    });

};

