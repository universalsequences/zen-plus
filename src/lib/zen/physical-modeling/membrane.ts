import {data, peek, poke} from '../data';
import {zswitch} from '../switch'
import {wrap, floor, mult, mix, max, add, sub, div, pow, min} from '../math'
import {lte, gte, eq, and} from '../compare'
import {sumLoop} from '../loop'
import {noise} from '../noise'
import {scale} from '../scale'
import {accum} from '../accum'
import {print} from '../print'
import {s} from '../seq'
import { float, UGen, Arg } from '../zen';

export const membrane = (input: UGen, edge: Arg = 0.3, pitch: Arg= .1, release: Arg=0.7, placement_x: Arg = 1, placement_y: Arg=1) => {
    //let pitch = .26318051381895;
    let tense = 0.8151;
    //let release = 0.77899595297991;
    
    // lets create a spider

    let N = 4;

    let nt2 = mix(pow(2,-10), pow(2,-13), release);

    // what do we really need here? We care about "now" and "prev"
    // no need to shift just have 2 channels and accum 0 - > 1
    let u = data(N*N, 3);

    // keep track of current index
    let currentIdx = accum(1, 0, {min: 0, max: 2, exclusive: false});
    let prevChannel = sub(currentIdx, 1)
    let center_xy = floor(div(N,2));

    // using current index grab the center value for "now"
    let u_center = peek(u, add(mult(center_xy, N), center_xy), prevChannel);

    let tension = mix(pow(2, -12), pow(2, -5), tense);
    let p0 = mix(.000011044095, 0.01, pitch);
    let p_eff = min(0.47, add(p0 , pow(mult(u_center,tension, 1), 2)));

    let f1 = input;


    return s(
        currentIdx,
        prevChannel,
        u_center,
        f1,
        nt2,
        p_eff,
        div(sumLoop(
        {min: 0, max: N},
        (i) => 
            sumLoop(
                {min: 0, max: N},
                (j) => {
                    /**
                     *      V V V V
                     *      V V V V 
                     *      V V V V
                     *      V V V V
                     */
                    let idx = add(mult(N,i), j);
                    let idx_n = add(idx, N); 
                    let idx_s = sub(idx, N); 
                    let idx_w = add(idx, 1); 
                    let idx_e = sub(idx, 1); 
                    
                    // get values of neighbors, handling "boundaries" by simply putting 0s
                    // when at the "edge" of the membrane
                    
                    let val = peek(u, idx, prevChannel);
                    let val_n = zswitch(eq(i, N-1), mult(edge, val) , peek(u, idx_n, prevChannel));
                    let val_s = zswitch(eq(i, 0), mult(edge, val), peek(u, idx_s, prevChannel));
                    let val_e = zswitch(eq(j, N-1), mult(edge, val), peek(u, idx_e, prevChannel));
                    let val_w = zswitch(eq(j, 0), mult(edge, val), peek(u, idx_w, prevChannel)); 

                    let triggerCond = and(
                        eq(i, floor(placement_x)), eq(j, floor(placement_y)));
                    
                    let energy = zswitch(
                        triggerCond, 
                        f1,
                        0);
                    
                    let neighbors = mult(0.5, add(val_n, val_w, val_e, val_s));
                    let prev2 = peek(u,  idx, sub(currentIdx, 2));
                    let current = div(
                        add(
                            mult(2, val), 
                            mult(
                                p_eff, 
                                add(neighbors, mult(1, energy), mult(-4, val))
                            ), 
                            mult(-1, sub(1,nt2), prev2)
                        ),
                        add(1, nt2)
                    );
                    
                    return s(
                      poke(u, idx, currentIdx, min(.9, max(-.9, current))),
                      current);
                }
            )), mult(0.0952, N)));
}