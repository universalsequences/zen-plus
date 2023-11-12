import { mult, add, sub, div } from '../math';
import { selector } from '../selector';
import { reciprical, cos, sin, not_sub, s, abs, Arg, UGen, history } from '../index';
import { zen_let } from '../let';
import { Generated, float } from '../zen'
import { memo } from '../memo'
import { Context } from '../context'


export const biquad = (in1: Arg, cutoff: Arg, resonance: Arg, gain: Arg, mode: Arg): UGen => {
    return memo((context: Context): Generated => {
        let history0 = history();
        let history1 = history();
        let history2 = history();
        let history3 = history();
        let history00 = history0(
            history1());
        let history21 = history2(
            history3());
        let history22 = history2(
            history3());
        let param3 = mode;
        let add4 = add(
            param3,
            1);
        let param5 = cutoff;
        let abs6 = abs(
            param5);
        let mult7 = mult(
            abs6,
            0.00014247585730565955);
        let cos8 = cos(
            mult7);
        let mult9 = mult(
            cos8,
            -1);
        let add10 = add(
            mult9,
            1);
        let div11 = div(
            add10,
            2);
        let sub12 = sub(
            mult9,
            1);
        let div13 = div(
            sub12,
            -2);
        let sin14 = sin(
            mult7);
        let mult15 = mult(
            sin14,
            0.5);
        let param16 = resonance;
        let abs17 = abs(
            param16);
        let div18 = div(
            mult15,
            abs17);
        let mult19 = mult(
            div18,
            -1);
        let mult20 = mult(
            div18,
            abs17);
        let mult21 = mult(
            mult20,
            -1);
        let add22 = add(
            div18,
            1);
        let selector23 = selector(
            add4,
            div11,
            div13,
            mult19,
            mult21,
            1,
            add22);
        let reciprical24 = reciprical(
            add22);
        let param25 = gain;
        let mult26 = mult(
            reciprical24,
            param25);
        let mult27 = mult(
            selector23,
            mult26);
        let mult28 = mult(
            history22,
            mult27);
        let param29 = in1;
        let history330 = history3(
            in1 as UGen);
        let mult31 = mult(
            mult9,
            2);
        let selector32 = selector(
            add4,
            add10,
            sub12,
            0,
            0,
            mult31,
            mult31);
        let mult33 = mult(
            selector32,
            mult26);
        let mult34 = mult(
            history3(),
            mult33);
        let not_sub35 = not_sub(
            div18,
            1);
        let selector36 = selector(
            add4,
            div11,
            div13,
            div18,
            mult20,
            1,
            not_sub35);
        let mult37 = mult(
            selector36,
            mult26);
        let mult38 = mult(
            param29,
            mult37);
        let add39 = add(
            s(
                s(
                    history21),
                mult28),
            s(
                s(
                    history330),
                mult34),
            mult38);
        let history040 = history0(
            history1());
        let mult41 = mult(
            not_sub35,
            reciprical24);
        let mult42 = mult(
            history040,
            mult41);
        let mult43 = mult(
            mult31,
            reciprical24);
        let mult44 = mult(
            history1(),
            mult43);
        let add45 = add(
            s(
                s(
                    history00),
                mult42),
            mult44);
        let sub46 = sub(
            add39,
            add45);
        let history147 = history1(
            sub46);
        let history148 = history1(
            sub46);
        return zen_let("biquad", s(
            history00,
            history147,
            history330,
            history21,
            history148))(context);
    });
}

export const biquadI = (in1: Arg, cutoff: Arg, resonance: Arg, gain: Arg, mode: Arg): UGen => {
    return memo((context: Context): Generated => {
        let history0 = history();
        let history1 = history();
        let history2 = history();
        let history3 = history();
        let history00 = history0(
            history1());
        let param1 = in1;
        let param2 = mode;
        let add3 = add(
            param2,
            1);
        let param4 = cutoff;
        let abs5 = abs(
            param4);
        let mult6 = mult(
            abs5,
            0.00014247585730565955);
        let cos7 = cos(
            mult6);
        let mult8 = mult(
            cos7,
            -1);
        let add9 = add(
            mult8,
            1);
        let div10 = div(
            add9,
            2);
        let sub11 = sub(
            mult8,
            1);
        let div12 = div(
            sub11,
            -2);
        let sin13 = sin(
            mult6);
        let mult14 = mult(
            sin13,
            0.5);
        let param15 = resonance;
        let abs16 = abs(
            param15);
        let div17 = div(
            mult14,
            abs16);
        let mult18 = mult(
            div17,
            abs16);
        let not_sub19 = not_sub(
            div17,
            1);
        let selector20 = selector(
            add3,
            div10,
            div12,
            div17,
            mult18,
            1,
            not_sub19);
        let add21 = add(
            div17,
            1);
        let reciprical22 = reciprical(
            add21);
        let param23 = gain;
        let mult24 = mult(
            reciprical22,
            param23);
        let mult25 = mult(
            selector20,
            mult24);
        let mult26 = mult(
            param1,
            mult25);
        let history227 = history2(
            in1 as UGen);
        let mult28 = mult(
            mult8,
            2);
        let selector29 = selector(
            add3,
            add9,
            sub11,
            0,
            0,
            mult28,
            mult28);
        let mult30 = mult(
            selector29,
            mult24);
        let mult31 = mult(
            history2(),
            mult30);
        let history332 = history3(
            history2());
        let mult33 = mult(
            div17,
            -1);
        let mult34 = mult(
            mult18,
            -1);
        let selector35 = selector(
            add3,
            div10,
            div12,
            mult33,
            mult34,
            1,
            add21);
        let mult36 = mult(
            selector35,
            mult24);
        let mult37 = mult(
            mult36,
            history3());
        let add38 = add(
            mult26,
            s(
                s(
                    history227),
                mult31),
            s(
                s(
                    history332),
                mult37));
        let mult39 = mult(
            mult28,
            reciprical22);
        let mult40 = mult(
            history1(),
            mult39);
        let sub41 = sub(
            add38,
            mult40);
        let mult42 = mult(
            not_sub19,
            reciprical22);
        let mult43 = mult(
            mult42,
            history0());
        let sub44 = sub(
            sub41,
            s(
                s(
                    history00),
                mult43));
        let history145 = history1(
            sub44);
        return s(
            history00,
            history145,
            history227,
            history332,
            history145)(context);
    });
}


