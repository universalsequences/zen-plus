import { mult, add, sub, div } from '../math';
import { s, abs, mix, clamp, Arg, UGen, min, float, Context, Generated, history } from '../index';

export const samplerate = (): UGen => {
    return (context: Context): Generated => {
        let x = float(context.sampleRate)(context);
        return x;
    }
};

/**
 * Zero Delay Filter: Taken blindly from chatGPT
 */
export const zdf = (in1: Arg, cutoff: Arg, resonance: Arg): UGen => {
    const z1 = history();
    const z2 = history();
    const z3 = history();
    const z4 = history();

    const omega = div(mult(2, Math.PI, min(cutoff, mult(0.1, samplerate()))), samplerate());
    const g = mult(omega, 1.989);

    const g2 = mult(g, g);
    const g3 = mult(g2, g);
    const g4 = mult(g3, g);

    // Compensation factor
    const A = div(1.0, add(1.0, mult(resonance, g4)));

    // Non-linear tanh approximation
    const tanh_approx = (x: Arg): UGen => {
        /*
        const num = mult(x, add(105.0, mult(x2, add(45.0, mult(x2, add(6.0, x2))))));
        const den = add(105.0, mult(x2, add(60.0, mult(x2, add(15, x2)))));
        return div(num, den);
        */

        let x2 = mult(x, x);
        return mix(div(mult(x, add(27.0, x2)), add(27.0, mult(9.0, x2))),
            div(x, add(1, abs(x), x2)),
            0); //clamp(omega, 0, .6));

    }

    // Input
    const input = in1;

    // Calculate the feedback signal
    const fb = clamp(
        mult(add(z4(), mult(g, add(z3(), mult(g2, add(z2(), mult(g3, z1())))))), resonance),
        -1,
        1);


    // ZDF Filter stages
    const u = sub(input, tanh_approx(mult(A, fb)));
    const y1 = tanh_approx(add(z1(), mult(g, u)));
    const y2 = tanh_approx(add(z2(), mult(g, y1)));
    const y3 = tanh_approx(add(z3(), mult(g, y2)));
    const y4 = tanh_approx(add(z4(), mult(g, y3)));

    return s(
        z1(add(z1(), mult(2, g, sub(u, y1)))),
        z2(add(z2(), mult(2, g, sub(y1, y2)))),
        z3(add(z3(), mult(2, g, sub(y2, y3)))),
        z4(add(z4(), mult(2, g, sub(y3, y4)))),
        y4
    );

};
