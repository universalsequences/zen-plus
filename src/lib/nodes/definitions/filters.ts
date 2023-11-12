import { Lazy, ObjectNode } from '../types';
import { memoZen, memo } from './memo';
import { doc } from './doc';
import { Operator, Statement } from './zen/types';

doc(
    'biquad',
    {
        description: "biquad filter with multiple modes",
        numberOfInlets: 5,
        numberOfOutlets: 1,
        inletNames: ["input", "cutoff (hz)", "resonance", "gain", "mode"]
    });
export const zen_biquad = (object: ObjectNode, cutoff: Lazy, resonance: Lazy, gain: Lazy, mode: Lazy) => {
    return memoZen(object, "biquad" as Operator, cutoff, resonance, gain, mode);
};

doc(
    'biquadI',
    {
        description: "biquad filter with multiple modes (form I)",
        numberOfInlets: 5,
        numberOfOutlets: 1,
        inletNames: ["input", "cutoff (hz)", "resonance", "gain", "mode"]
    });

export const zen_biquadI = (object: ObjectNode, cutoff: Lazy, resonance: Lazy, gain: Lazy, mode: Lazy) => {
    return memoZen(object, "biquadI" as Operator, cutoff, resonance, gain, mode);
};

doc(
    'onepole',
    {
        description: "one pole filter",
        numberOfInlets: 2,
        numberOfOutlets: 1,
        inletNames: ["input", "g"]
    });
export const zen_onepole = (object: ObjectNode, cutoff: Lazy) => {
    return memoZen(object, "onepole" as Operator, cutoff);
};

doc(
    'svf',
    {
        description: "svf filter",
        numberOfInlets: 4,
        numberOfOutlets: 4,
        inletNames: ["input", "cutoff (0-1)", "resonance", "mode"]
    });
export const zen_filter_svf = (object: ObjectNode, cutoff: Lazy, resonance: Lazy, mode: Lazy) => {
    return memoZen(object, "svf" as Operator, cutoff, resonance, mode);
};

doc(
    'vactrol',
    {
        description: "vactrol filter",
        numberOfInlets: 3,
        numberOfOutlets: 1,
        inletNames: ["input", "rise (ms)", "fall (ms)"]
    });
export const zen_vactrol = (object: ObjectNode, rise: Lazy, fall: Lazy) => {
    return memoZen(object, "vactrol" as Operator, rise, fall);
};

export const filters = {
    'vactrol': zen_vactrol,
    'svf': zen_filter_svf,
    'onepole': zen_onepole,
    'biquad': zen_biquad,
    'biquadI': zen_biquadI,
};