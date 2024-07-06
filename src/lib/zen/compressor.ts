import { Arg, zswitch, eq, s } from './index';
import { pow, lt, lte, gte, log, log10, sign, gt, exp, max, abs, sub, div, mult, add } from './math';
import { history } from './history';

const amp2db = (amp: Arg) => mult(20, log10(max(abs(amp), 0.00001)));
const db2amp = (db: Arg) => pow(10, div(db, 20));

export const compressor = (
    in1: Arg,
    ratio: Arg,
    threshold: Arg,
    knee: Arg,
    attack: Arg = .01,
    release: Arg = 0.05
) => {
    const in_db = amp2db(in1);

    const attack_coef = exp(div(log(0.01), mult(attack, 44100)));
    const release_coef = exp(div(log(0.01), mult(release, 44100)));

    //const attack_coef = add(0, exp(div(-1, mult(attack, 44100))));
    //const release_coef = add(0, exp(div(-1, mult(release, 44100))));

    // Compute the difference between the input signal and the threshold
    const kneeStart = sub(threshold, div(knee, 2));
    const kneeEnd = add(threshold, div(knee, 2));

    const positionWithinKnee = div(sub(in_db, kneeStart), knee);
    const interpolatedRatio = add(1, mult(positionWithinKnee, sub(ratio, 1)));
    const overThreshold = sub(in_db, add(kneeStart, mult(positionWithinKnee, sub(threshold, kneeStart))));

    const gr = zswitch(
        lte(in_db, kneeStart),
        0,
        zswitch(
            gte(in_db, kneeEnd),
            mult(sub(in_db, threshold), sub(1, div(1, ratio))),
            mult(overThreshold, sub(1, div(1, interpolatedRatio)))));


    // soft knee
    /*
    const gr = zswitch(
        gt(delta, mult(-0.5, knee)),
        zswitch(lt(delta, mult(0.5, knee)),
            mult(div(sub(ratio, 1), mult(2, knee)), mult(tmp, tmp)),
            mult(delta, sub(ratio, 1))),
        0);
        */

    // Combine the 'knee' gain reduction with the standard gain reduction
    //const gr = mult(min(knee_gr, sub(ratio, 1.0)), max(0.0, sub(in_db, threshold)));

    const prev_gr = history();
    // Apply the attack/release envelope to the gain reduction
    return s(
        prev_gr(
            zswitch(gt(gr, prev_gr()), add(mult(attack_coef, prev_gr()), mult(gr, sub(1, attack_coef))),
                add(mult(release_coef, prev_gr()), mult(gr, sub(1, release_coef))))),
        mult(sign(in1), db2amp(sub(in_db, prev_gr()))));
};
