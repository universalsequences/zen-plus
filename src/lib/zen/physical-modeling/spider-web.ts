import { data, peek, BlockGen, poke, Gettable } from '../data';
import { breakIf } from '../break';
import { zswitch } from '../switch'
import { floor, mult, mix, max, add, sub, div, pow, min } from '../math'
import { neq, lte, gte, gt, eq, and } from '../compare'
import { sumLoop } from '../loop'
import { noise } from '../noise'
import { scale } from '../scale'
import { accum } from '../accum'
import { s } from '../seq'
import { UGen, Arg } from '../zen';
import { SpiderWeb } from './web-maker'

export interface Membrane {
    membrane: UGen;
    data: Gettable<Float32Array>;
}

export interface Material {
    pitch: Arg,
    release: Arg,
    noise: Arg,
    x: Arg,
    y: Arg
}

/*
export const membrane = (
    input: UGen,
    material: Material,
    web: SpiderWeb): Membrane => {
    const {
        pitch,
        release,
    } = material;
    let tense = 0.999151;
    const SIZE = web.size;
    let maxNeighbors = web.maxNeighbors;

    const neighbors = data(SIZE * maxNeighbors, 1, web.neighbors);
    const coeffs = data(SIZE, SIZE, web.coeffs);

    let N = SIZE;

    // the dampening- i.e. "the release"
    let nt2 = mix(
        pow(2, -8),
        pow(2, -13),
        release);

    // contains the data for 3 time steps (now, now-1, now-2)
    let u = data(N, 3);

    // keep track of current index (so we know what channel to peek into U)
    let currentIdx = accum(1, 0, { min: 0, max: 2, exclusive: false });
    let prevChannel = sub(currentIdx, 1)

    const sumNeighbors = (idx: Arg, u: BlockGen, neighbors: BlockGen, coeff: BlockGen) =>
        sumLoop({
            min: 0, max: maxNeighbors + 1
        }, (i) => {
            let neighbor = peek(neighbors, add(mult(maxNeighbors, idx), i), 0);
            let coeff = peek(coeffs, neighbor, idx);
            // if neighbor is not -1 then we have a valid neighbor 
            return s(
                breakIf(and(gte(idx, maxNeighbors), gt(i, 3))),
                zswitch(
                    neq(neighbor, -1),
                    mult(
                        zswitch(
                            eq(coeff, -1),
                            mult(-1, peek(u, idx, prevChannel)),
                            // the value of the neighbor in previous time-step
                            peek(u, neighbor, prevChannel)),
                        coeff // the coefficient for that neighbor & idx combo
                    ),
                    0))
        });


    // using current index grab the center value for "now"
    let u_center = peek(u, 0, prevChannel);

    let tension = mix(pow(2, -12), pow(2, -5), tense);
    let p0 = mix(.00000000011044095, 0.01, pitch);
    let p_eff = min(0.47, add(p0, pow(mult(u_center, tension, 1), 2)));

    let f1 = input;

    return {
        data: u, // send back the data for possible visualization
        membrane: s(
currentIdx,
    prevChannel,
    u_center,
    f1,
    nt2,
    p_eff,
    div(sumLoop(
        { min: 0, max: N },
        (idx) => {
            let val = peek(u, idx, prevChannel);

          
let noiseParam = material.noise ? min(1.55, mult(1.55, material.noise)) : 0;
let noiseFactor = scale(noise(), 0, 1, 0.1, noiseParam);
let neighborsEnergy = mult(
    noiseFactor,
    0.5,
    sumNeighbors(idx, u, neighbors, coeffs));

let triggerCond = eq(idx, floor(placement));

let energy = zswitch(
    triggerCond,
    f1,
    0);

let prev2 = peek(u, idx, sub(currentIdx, 2));

let current = div(
    add(
        mult(2, val),
        mult(
            p_eff,
            add(neighborsEnergy, mult(1, energy), mult(-4, val))
        ),
        mult(-1, sub(1, nt2), prev2) // dampening term
    ),
    add(1, nt2) // dampening term
);

return s(
    poke(u, idx, currentIdx, min(1, max(-1, current))),
    current);
        }
    ), mult(.013, N)))
    };
}
*/
