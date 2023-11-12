import {
    s,
    input,
    accum, float, phasor, zen, history, ParamGen, Arg, History, UGen, print
} from './index';
import { Component } from './physical-modeling/Component';
import { param } from './param';
import { message } from './message';
import { zdf } from './filters/zdf';
import { svf } from './filters/svf';
import { vactrol, onepole } from './filters/onepole';
import { compressor } from './compressor';
import { fixnan, elapsed, dcblock } from './utils';
import { click, Clicker } from './click';
import { Range, variable, rawSumLoop } from './loop'
import { sampstoms, mstosamps } from './utils';
import { output } from './output'
import { data, poke, peek, BlockGen, Interpolation } from './data';
import { delta, change, rampToTrig } from './delta';
import { interp } from './interp';
import { cycle } from './cycle';
import { delay } from './delay';
import { latch } from './latch';
import { noise } from './noise';
import { scale } from './scale';
import { zswitch } from './switch';
import { triangle } from './triangle';
import { adsr } from './adsr';
import { sine } from './unit';
import { t60 } from './t60';
import {
    RoundMode,
    xor,
    exp2,
    exp,
    log2,
    atan,
    tan,
    add, sub, mult, div, lt, lte, gt, gte, and, or, eq, neq, mod, abs, floor,
    ceil, sin, cos, tanh, pow, sqrt, min, max, shiftLeft, shiftRight,
    sign, mix, wrap, clamp, reciprical, not_sub, round
} from './math';
import { AccumParams } from './accum';

const test = () => {
    let history0 = history();
    let history1 = history();
    let history2 = history();
    let phasor0 = phasor(
        0.6956521739130435);
    let rampToTrig1 = rampToTrig(
        phasor0);
    let param2 = param(0.30782381918284557);
    let sub3 = sub(
        param2,
        history1());
    let param4 = param(36);
    let reciprical5 = reciprical(
        param4);
    let max6 = max(
        reciprical5,
        0);
    let mult7 = mult(
        max6,
        -1);
    let clamp8 = clamp(
        sub3,
        mult7,
        max6);
    let add9 = add(
        clamp8,
        history1());
    let history110 = history1(
        add9);
    let param11 = param(0.22545951152049765);
    let param12 = param(0.01737088912844676);
    let mult13 = mult(
        param12,
        1);
    let param14 = param(0.9033923526394998);
    let mult15 = mult(
        param14,
        1);
    let param16 = param(165);
    let param17 = param(155);
    let param18 = param(0.008773769939535929);
    let param19 = param(1.1637791058042153);
    let param20 = param(0.053349766377244756);
    let mult21 = mult(
        param20,
        1);
    let param22 = param(0.5013915298089167);
    let param23 = param(0.15801832385478798);
    let model24 = new Component(
        {
            noise: param18,
            couplingCoefficient: param11,
            x: param16,
            y: param17,
            pitch: mult13,
            release: mult15
        }
        ,
        {
            data: data(121, 1, new Float32Array([0, 1.1172394752502441, 1.1172394752502441, 1.1172394752502441, 1.1172394752502441, 1.1172394752502441, 0, 0, 0, 0, 0, 1.1172394752502441, 0, 0.6000000238418579, 0, 0, 0.6000000238418579, 4.5, 0, 0, 0, 0, 1.1172394752502441, 0.6000000238418579, 0, 0.6000000238418579, 0, 0, 0, 4.5, 0, 0, 0, 1.1172394752502441, 0, 0.6000000238418579, 0, 0.6000000238418579, 0, 0, 0, 4.5, 0, 0, 1.1172394752502441, 0, 0, 0.6000000238418579, 0, 0.6000000238418579, 0, 0, 0, 4.5, 0, 1.1172394752502441, 0.6000000238418579, 0, 0, 0.6000000238418579, 0, 0, 0, 0, 0, 4.5, 0, 4.5, 0, 0, 0, 0, -1, 0.6000000238418579, 0, 0, 0.6000000238418579, 0, 0, 4.5, 0, 0, 0, 0.6000000238418579, -1, 0.6000000238418579, 0, 0, 0, 0, 0, 4.5, 0, 0, 0, 0.6000000238418579, -1, 0.6000000238418579, 0, 0, 0, 0, 0, 4.5, 0, 0, 0, 0.6000000238418579, -1, 0.6000000238418579, 0, 0, 0, 0, 0, 4.5, 0.6000000238418579, 0, 0, 0.6000000238418579, -1])),
            dampeningData: data(11, 1, new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])),
            pointsData: data(22, 1, new Float32Array([150, 150, 166.5953826904297, 201.07534790039062, 106.55271911621094, 181.56629943847656, 106.55271911621094, 118.43370056152344, 166.5953826904297, 98.92465209960938, 203.70379638671875, 150, 170.71560668945312, 213.756103515625, 95.76582336425781, 189.4034423828125, 95.76582336425781, 110.59656524658203, 170.71560668945312, 86.24390411376953, 217.03712463378906, 150])),
            maxNeighbors: 5,
            neighborsMatrix: [[1, 2, 3, 4, 5], [0, 6, 5, 2, -1], [0, 7, 1, 3, -1], [0, 8, 2, 4, -1], [0, 9, 3, 5, -1], [0, 10, 4, 1, -1], [1, 7, 10, 6, -1], [2, 8, 6, 7, -1], [3, 9, 7, 8, -1], [4, 10, 8, 9, -1], [5, 6, 9, 10, -1]],
            neighbors: new Float32Array([1, 2, 3, 4, 5, 0, 6, 5, 2, -1, 0, 7, 1, 3, -1, 0, 8, 2, 4, -1, 0, 9, 3, 5, -1, 0, 10, 4, 1, -1, 1, 7, 10, 6, -1, 2, 8, 6, 7, -1, 3, 9, 7, 8, -1, 4, 10, 8, 9, -1, 5, 6, 9, 10, -1]),
            size: 11
        }
        , true);
    let model25 = new Component(
        {
            noise: param23,
            couplingCoefficient: param19,
            x: 0,
            y: 0,
            pitch: mult21,
            release: param22
        }
        ,
        {

            data: data(49, 1, new Float32Array([0, 1.1172394752502441, 1.1172394752502441, 2.2371134757995605, 0.7191489338874817, 1.1172394752502441, 1.1172394752502441, 1.1172394752502441, -1, 0.6000000238418579, 0, 0, 0, 0.6000000238418579, 1.1172394752502441, 0.6000000238418579, -1, 0.6000000238418579, 0, 0, 0, 2.2371134757995605, 0, 0.6000000238418579, -1, 0.6000000238418579, 0, 0, 0.7191489338874817, 0, 0, 0.6000000238418579, -1, 0.6000000238418579, 0, 1.1172394752502441, 0, 0, 0, 0.6000000238418579, -1, 0.6000000238418579, 1.1172394752502441, 0.6000000238418579, 0, 0, 0, 0.6000000238418579, -1])),
            dampeningData: data(7, 1, new Float32Array([1, 1, 1, 0.7525773048400879, 0.5729984045028687, 0.5384615659713745, 1])),
            pointsData: data(14, 1, new Float32Array([150, 150, 176.85189819335938, 196.50885009765625, 123.14810180664062, 196.50885009765625, 96.29620361328125, 150, 123.14810180664062, 103.49114990234375, 176.85189819335938, 103.49114990234375, 203.70379638671875, 150])),
            maxNeighbors: 6,
            neighborsMatrix: [[1, 2, 3, 4, 5, 6], [0, 2, 6, 1, -1, -1], [0, 3, 1, 2, -1, -1], [0, 4, 2, 3, -1, -1], [0, 5, 3, 4, -1, -1], [0, 6, 4, 5, -1, -1], [0, 1, 5, 6, -1, -1]],
            neighbors: new Float32Array([1, 2, 3, 4, 5, 6, 0, 2, 6, 1, -1, -1, 0, 3, 1, 2, -1, -1, 0, 4, 2, 3, -1, -1, 0, 5, 3, 4, -1, -1, 0, 6, 4, 5, -1, -1, 0, 1, 5, 6, -1, -1]),
            size: 7
        }
        , false);
    let model26 = model24.bidirectionalConnect(model25);;
    let model27 = s(
        rampToTrig1,
        model24.currentChannel,
        model24.prevChannel,
        model25.currentChannel,
        model25.prevChannel,
        mix(model24.gen(rampToTrig1), model25.gen(add(0)), history110)
    );
    let param28 = param(8);
    let mult29 = mult(
        s(
            rampToTrig1,
            model24.currentChannel,
            model24.prevChannel,
            model25.currentChannel,
            model25.prevChannel,
            mix(model24.gen(rampToTrig1), model25.gen(add(0)), history110)
        ),
        param28);
    let param30 = param(0.08808957801586237);
    let mult31 = mult(
        param30,
        0.7853981633974483);
    let tan32 = tan(
        mult31);
    let add33 = add(
        tan32,
        1);
    let div34 = div(
        tan32,
        add33);
    let param35 = param(0.11972789115646258);
    let reciprical36 = reciprical(
        param35);
    let add37 = add(
        div34,
        reciprical36);
    let mult38 = mult(
        history0(),
        add37);
    let add39 = add(
        history2(),
        mult38);
    let sub40 = sub(
        mult29,
        add39);
    let mult41 = mult(
        div34,
        div34);
    let mult42 = mult(
        div34,
        reciprical36);
    let add43 = add(
        mult41,
        mult42);
    let add44 = add(
        add43,
        1);
    let reciprical45 = reciprical(
        add44);
    let mult46 = mult(
        sub40,
        reciprical45);
    let mult47 = mult(
        mult46,
        div34);
    let add48 = add(
        mult47,
        history0());
    let mult49 = mult(
        add48,
        div34);
    let add50 = add(
        mult49,
        history2());
    let add51 = add(
        add50,
        mult49);
    let history252 = history2(
        add51);
    let add53 = add(
        mult47,
        add48);
    let history054 = history0(
        add53);
    let history155 = history1(
        add9);
    let mult56 = mult(
        mult46,
        1);
    let mult57 = mult(
        mult56,
        300);
    let mult58 = mult(
        mult57,
        0.7853981633974483);
    let tanh59 = tanh(
        mult58);
    let atan60 = atan(
        tanh59);
    let mult61 = mult(
        atan60,
        1.2732395447351628);
    return s(
        history054,
        history252,
        history155,
        mult61)
}
