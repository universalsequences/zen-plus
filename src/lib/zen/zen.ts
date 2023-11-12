import { Context } from './context';
import { Argument, Function } from './functions';
import { Target } from './targets';
import { History } from './history';

/**
 * Zen is a minimal implementation of a few simple gen~ (max/msp) 
 * operators
 * The goal is that by writing this simple library, and putting it 
 *  onchain, so complex musical onchain NFTs can be made.
 * 
 */

export interface Generated {
    code: string; /*  the code generated */
    outerCode?: string;
    variable?: string; /* the variable name referenced */
    histories: string[];
    variables?: string[];
    outerHistories?: string[];
    outputs?: number;
    inputs?: number;
    params: History[];
    context?: Context;
    isLoopDependent?: boolean;
    outerLoops?: string[];
    functions: Function[];
    functionArguments: Argument[];
};

export type UGen = (context: Context) => Generated;

export type ZenGraph = Generated & {
    context: Context;
    histories: string[];
    numberOfInputs: number;
    numberOfOutputs: number;
}

export type Arg = UGen | number;

export const float = (x: number): UGen => {
    let floated = x.toString();
    if (x - Math.floor(x) === 0) {
        floated += ".0";
    }
    return () => {
        return {
            code: floated,
            variable: floated,
            variables: [],
            functions: [],
            functionArguments: [],
            histories: [],
            params: []
        };
    };
};

export const input = (inputNumber: number = 0): UGen => {
    return (context: Context) => {
        let name = context.input(inputNumber);
        return {
            code: name,
            functions: [],
            functionArguments: [],
            variable: name,
            variables: [],
            histories: [],
            inputs: inputNumber,
            params: []
        };
    };
};


// The way this works w/o outputs: each output will go in a different argument
export const zen = (...inputs: UGen[]): ZenGraph => {
    let context: Context = new Context(Target.Javascript);
    let code = "";
    let lastVariable = "";
    let numberOfOutputs = 1;
    let numberOfInputs = 1;
    let histories: string[] = [];
    let params: History[] = [];
    let functions: Function[] = [];
    let variables: string[] = [];
    let i = 0;
    for (let input of inputs) {
        let _out = input(context);
        code += ' ' + _out.code;
        lastVariable = _out.variable!;
        params = [...params, ..._out.params];
        i++;
        if (_out.variables) {
            variables = [...variables, ..._out.variables];
        }
        if (_out.histories) {
            histories = [
                ...histories,
                ..._out.histories
            ];
        }
        if (_out.functions) {
            functions = [
                ...functions,
                ..._out.functions
            ];
            functions = Array.from(new Set(functions));
        }
        if (_out.outputs !== undefined &&
            (_out.outputs! + 1) > numberOfOutputs) {
            numberOfOutputs = _out.outputs! + 1;
        }
        if (_out.inputs !== undefined && _out.inputs > numberOfInputs) {
            numberOfInputs = _out.inputs;
        }
    }
    if (numberOfOutputs === 1) {
        code += `
output0 = ${lastVariable};
`
    }

    return {
        code,
        context,
        variable: lastVariable,
        variables: variables,
        histories,
        numberOfInputs: numberOfInputs + 1,
        numberOfOutputs,
        params,
        functions,
        functionArguments: []
    };
}

export const genArg = (input: Arg, context: Context): Generated => {
    if (typeof input === "number") {
        return float(input)(context);
    }
    return input(context);
};


