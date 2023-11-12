import { UGen, Arg } from './zen';
import { memo } from './memo';
import { Context } from './context';
import { history } from './history';
import { lt } from './compare'
import { sign, div, sub, add, abs } from './math';

export const delta = (input: Arg): UGen => {
    return memo((context: Context) => {
        let h = history();
        return sub(input, h(input as UGen))(context);
    });
};

export const change = (input: Arg): UGen => {
    return memo((context: Context) => {
        let h = history();
        return sign(sub(input, h(input as UGen)))(context);
    });
};

export const rampToTrig = (ramp: Arg): UGen => {
    return memo((context: Context) => {
        let history1 = history();

        let hval = history1(ramp as UGen);
        return lt(
            0,
            change(
                lt(
                    0.5,
                    abs(div(
                        sub(ramp, hval),
                        add(ramp, hval))))))(context);
    });
};
