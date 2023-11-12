import { Arg, UGen, Generated } from './zen'
import { memo } from './memo';
import { Target } from './targets';
import { Context } from './context'
import { history } from './history';
import { mix, sub } from './math';

export const sampstoms = (input: Arg) => {
    return memo((context: Context) => {
        // samples to ms 44100 - > 1000
        let _input = context.gen(input);
        let [ms] = context.useVariables('ms');
        let code = `${context.varKeyword} ${ms} = 1000.0*${_input.variable}/${context.sampleRate};`;

        return context.emit(code, ms, _input);
    });
};

export const mstosamps = (input: Arg) => {
    return memo((context: Context) => {
        // ms to samps 1000 -> 44100 
        let _input = context.gen(input);
        let [samps] = context.useVariables('samps');
        let code = `${context.varKeyword} ${samps} = (${_input.variable}/1000)*${context.sampleRate};`;

        return context.emit(code, samps, _input);
    });
};

export const dcblock = (input: Arg) => {
    let hist = history();
    return sub(
        input,
        hist(
            mix(input, hist(), 0.999)));
};

export const elapsed = () => {
    return memo((context: Context) => {
        // ms to samps 1000 -> 44100 
        let [elapsed] = context.useVariables('elapsed');
        let code = `${context.varKeyword} ${elapsed} = elapsed;`;
        return context.emit(code, elapsed);
    });
};

export const fixnan = (input: Arg) => {
    return memo((context: Context) => {
        // ms to samps 1000 -> 44100 
        let _input = context.gen(input);
        let [fixed] = context.useVariables('fixed');
        let op = context.target === Target.C ? "isnan" : "isNaN";
        let code = `${context.varKeyword} ${fixed} = ${op}(${_input.variable}) ? 0.0 : ${_input.variable};`;
        return context.emit(code, fixed, _input);
    });
};

