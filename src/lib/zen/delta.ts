import { UGen, Arg } from './zen';
import { memo } from './memo';
import { s } from './seq';
import { Context } from './context';
import { history } from './history';
import { lt } from './compare'
import { zen_let } from './let';
import { sign, div, sub, add, abs } from './math';

export const delta = (input: Arg): UGen => {
    let h = history();
    //return zen_let("delta", s(
    //    h(input as UGen),
    //    sub(input, h())));
    return zen_let("delta", s(
        h(input as UGen),
        sub(input, h())));
};

export const change = (input: Arg): UGen => {
    let h = history();
    return s(
        h(input as UGen),
        sign(sub(input, h())));
};

export const rampToTrig = (ramp: Arg): UGen => {
    let history1 = history();

    //let hval = history1(ramp as UGen);
    return zen_let("rampToTrig", s(
        history1(ramp as UGen),
        lt(
            0,
            change(
                lt(
                    0.5,
                    abs(div(
                        sub(ramp, history1(
                        )),
                        add(ramp, history1()))))))));

};
