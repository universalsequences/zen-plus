
import { doc } from './doc';
//import { HasAttributes } from './interp';
import { BlockGen } from '@/lib/zen/data';
import { Operator, Statement, CompoundOperator } from './zen/types';
import { Lazy, ObjectNode, Message } from '../types';
import { print, s, Arg } from '@/lib/zen/index';
import { memoZen, memo } from './memo';
import { noise, rampToTrig, sine, triangle, ParamGen, accum, phasor, param, zen, createWorklet, UGen } from '@/lib/zen/index';

doc(
    'param',
    {
        description: "sets a parameter",
        numberOfInlets: 0,
        numberOfOutlets: 1,
        inletNames: ["parameter value"]
    }
);

export const zen_param = (object: ObjectNode) => {
    let p: ParamGen;
    return (x: Message): Statement [] => {
        if (p === undefined) {
            p = param(0);
        }
        if (typeof x === "number") {
            p.set!(x);
            return [];
        }
        let out: Statement = [{
            name: "param",
            param: p,
            value: 0
        }];
        out.node = object;
        return [out];
    };
};

doc(
    'cycle',
    {
        numberOfInlets: 2,
        numberOfOutlets: 1,
        inletNames: ["frequency", "phase"],
        description: "sine wave oscillator",
        defaultValue: 0
    });

export const zen_cycle = (object: ObjectNode, phase: Lazy) => {
    return memoZen(object, "cycle" as Operator, phase);
};

doc(
    'accum',
    {
        inletNames: ["incrementer", "reset", "min", "max"],
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "accumulates incrementer between min and max, conditionally resetting"
    });

export const zen_accum = (object: ObjectNode, reset: Lazy, min: Lazy, max: Lazy) => {
    return memo(object, (x: Message): Statement => {
            let params = { min: min(), max: max() };
            let operator = {
                name: "accum",
                params
            };
            return [operator as CompoundOperator, x as Statement, reset() as Statement];
        }, reset, min, max);
};

doc(
    'triangle',
    {
        inletNames: ["ramp", "duty"],
        numberOfInlets: 2,
        numberOfOutlets: 1,
        description: "turns unipolar ramp into triangle wave, with control over duty cycle",
        defaultValue: 0.5
    });

export const zen_triangle = (object: ObjectNode, duty: Lazy) => {
    return memoZen(object, "triangle" as Operator, duty);
};

doc(
    'sine',
    {
        inletNames: ["input"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "calculates sine function on input"
    });

export const zen_sine = (object: ObjectNode) => {
    return memoZen(object, "sine" as Operator);
};

doc(
    'rampToTrig',
    {
        inletNames: ["ramp"],
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "turns ramps into triggers"
    },
);
export const zen_rampToTrig = (object: ObjectNode) => {
    return memoZen(object, "rampToTrig" as Operator);
};

doc(
    'noise',
    {
        numberOfInlets: 0,
        numberOfOutlets: 1,
        description: "generates a random signal from 0-1"
    },
);
export const zen_noise = (object: ObjectNode) => {
    return memoZen(object, "noise" as Operator);
};

export const core = {
    cycle: zen_cycle,
    triangle: zen_triangle,
    noise: zen_noise,
    rampToTrig: zen_rampToTrig,
    sine: zen_sine,
    accum: zen_accum,
    param: zen_param
}