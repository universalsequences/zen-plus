import { mult, add, sub, div } from '../math';
import { interp } from '../interp';
import { t60, reciprical, tan, max, s, abs, mix, mstosamps, clamp, Arg, UGen, min, float, Context, Generated, history } from '../index';
import { samplerate } from './zdf';
import { memo } from '../memo';


export const svf = (in1: Arg, cutoff: Arg, resonance: Arg, mode: Arg): UGen => {
    return memo((context: Context): Generated => {
        let history0 = history();
        let history1 = history();
        let param0 = in1;
        let param1 = cutoff;
        let mult2 = mult(
            param1,
            0.7853981633974483);
        let tan3 = tan(
            mult2);
        let add4 = add(
            tan3,
            1);
        let div5 = div(
            tan3,
            add4);
        let param6 = resonance;
        let reciprical7 = reciprical(
            param6);
        let add8 = add(
            div5,
            reciprical7);
        let mult9 = mult(
            history1(),
            add8);
        let add10 = add(
            history0(),
            mult9);
        let sub11 = sub(
            param0,
            add10);
        let mult12 = mult(
            div5,
            div5);
        let mult13 = mult(
            div5,
            reciprical7);
        let add14 = add(
            mult12,
            mult13);
        let add15 = add(
            add14,
            1);
        let reciprical16 = reciprical(
            add15);
        let mult17 = mult(
            sub11,
            reciprical16);
        let mult18 = mult(
            mult17,
            div5);
        let add19 = add(
            mult18,
            history1());
        let mult20 = mult(
            add19,
            div5);
        let add21 = add(
            mult20,
            history0());
        let add22 = add(
            add21,
            mult20);
        let history023 = history0(
            add22);
        let add24 = add(
            mult18,
            add19);
        let history125 = history1(
            add24);
        let param26 = mode;
        let interp27 = interp(
            param26,
            s(
                s(
                    history023),
                add21),
            mult17,
            s(
                s(
                    history125),
                add19));
        return s(
            history023,
            history125,
            interp27)(context);
    });
};


