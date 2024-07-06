import { UGen, Generated, genArg, Arg } from './zen';
import { mult, mix } from './math';
import { history, History } from './history'
import { Context } from './context';
import { simdMemo } from './memo';
import { cKeywords } from './math';
import { Target } from './targets';
import { uuid } from './uuid';

export const t60 = (input: Arg): UGen => {
    let id = uuid();
    return simdMemo((context: Context,  _input: Generated): Generated => {
        let [variable] = context.useCachedVariables(id, "t60Val");
        let exp = context.target === Target.C ? cKeywords["Math.exp"] : "Math.exp";
        let code = `
${context.varKeyword} ${variable} = ${exp}(-6.907755278921 / ${_input.variable});
`;
        return context.emit(
            code,
            variable,
            _input);
    }, undefined, input);
};

export type TrigGen = UGen & {
    trigger?: () => void
};

export const decay = (decayTime: Arg = 44100): TrigGen => {
    let ssd: History = history();

    let trigDecay: TrigGen = ssd(mult(ssd(), t60(decayTime)));
    trigDecay.trigger = () => {
        ssd.value!(1);
    };

    return trigDecay;
};

export const decayTrig = (input: Arg, decayTime: Arg = 44100): TrigGen => {
    let ssd: History = history();

    let trigDecay: TrigGen = ssd(mix(input, ssd(), t60(decayTime)));

    return trigDecay;
};

