import { Arg, Context, UGen, Generated } from './index';
import { cKeywords } from './math';
import { Target } from './targets';
import { memo } from './memo';
import { LoopContext } from './context';

//export type FunctionBody = (i: UGen, ...args: UGen[]) => UGen;

/**
 * 
 * Creates a function and adds it to the context
 * The returned type is LazyFunction and when evaluated for the first
 * time by an envocation (a call of the function), it will append
 * the function to the context
 *
 * The body needs to be generated
 */

export type Function = {
    name: string;
    size: number;
} & Generated;

export type LazyFunction = (context: Context) => Function;

export const defun = (name: string, size: number, ...bodies: UGen[]): LazyFunction => {

    let cache: Function;

    return (context: Context): Function => {
        if (cache) {
            return cache;
        }
        let cached = (context.functions.find(x => x.name === name));
        if (cached) {
            return cached;
        }

        let functionContext = new LoopContext("invocation", { min: 0, max: size }, context);
        let _bodies: Generated[] = bodies.map(x => x(functionContext));

        let histories = Array.from(new Set(_bodies.flatMap(x => x.histories).filter(x => x)));
        let outerHistories: string[] = Array.from(new Set(_bodies.flatMap(x => x.outerHistories || [])));

        // now lets pack all of these
        let THIS = context.target === Target.C ? "" : "this.";
        let arrayName = `${THIS}${name}Array`;
        let code = "";
        let i = 0;
        let _cache = {};
        for (let body of _bodies) {
            _cache = { ...body };
            let _code = body.code;
            if (!_code.includes(";")) {
                _code += ";";
            }
            code += `
${_code}
${arrayName}[${i}] = ${body.variable};
            `;
            i++;
        }

        let prefix = context.target === Target.C ? "&" : "";
        cache = {
            ..._cache,
            name,
            variables: [],
            size,
            code,
            variable: prefix + arrayName,
            params: [],
            functions: emitFunctions(..._bodies),
            functionArguments: emitArguments(..._bodies),
            histories: [...histories, ...outerHistories]
        };
        context.functions.push(cache);
        return cache;
    };
};

export const call = (lazyFunction: LazyFunction, invocation: number, ...args: UGen[]): UGen => {
    let already = false;
    return memo((context: Context): Generated => {
        let _func: Function = lazyFunction(context);
        let _args: Generated[] = args.map(arg => context.gen(arg));
        let name = _func.name;
        already = true;
        let [variable] = context.useVariables(`${name}Value`);

        // call the function w/ the invocation number
        // how do we route the correct arguments to the right ordering
        // we almost need to "name" 
        let THIS = context.target === Target.Javascript ? "this." : "";
        let keyword = context.target === Target.C ? context.varKeyword + "*" : "let";
        let code = `${keyword} ${variable} = ${THIS}${name} (${invocation}, ${_args.map(x => x.variable).join(",")}); 
`;
        for (let i = 0; i < 8; i++) {
            code += `${context.varKeyword} ${variable}_${i} = ${variable}[${i}];
`;
        }

        let generated: Generated = context.emit(code, variable, ..._args);
        let _funcs = generated.functions || [];

        // append function
        generated.functions = [..._funcs, _func];
        return generated;
    });
};

export const nth = (array: Arg, index: Arg = 0) => {
    return memo((context: Context) => {
        let _array = context.gen(array);
        let _index = context.gen(index);
        let [value] = context.useVariables("nth");
        let cast = context.target === Target.C ? "(int)" : "";
        let floor = context.target === Target.C ? cKeywords["Math.floor"] : "Math.floor";
        let code = `${context.varKeyword} ${value} = ${_array.variable}_${parseInt(_index.variable as string)};`;//[${cast}(${_index.variable})];`;
        return context.emit(code, value, _array, _index);
    });
}


export const emitFunctions = (...gen: Generated[]): Function[] => {
    return Array.from(new Set(gen.flatMap(x => x.functions || [])));
};

export const emitArguments = (...gen: Generated[]): Argument[] => {
    return Array.from(new Set(gen.flatMap(x => x.functionArguments))).filter(x => x);
};

// when argument is called we need to simply just use its name...

export interface Argument {
    name: string;
    num: number;
}
export const argument = (num: number, name: string): UGen => {
    return memo((context: Context): Generated => {
        let [_var] = context.useVariables("funcArg");
        let varKeyword = (context as LoopContext).context ? (context as LoopContext).context.varKeyword : context.varKeyword;
        let out = `${varKeyword} ${_var} = ${name}; `;
        let generated: Generated = context.emit(out, _var);
        generated.isLoopDependent = true;
        let args = [...generated.functionArguments, { name, num }];
        // dedupe
        args = Array.from(new Set(args));
        generated.functionArguments = args;
        // as these occur append them to generated
        return generated;
    });
}
