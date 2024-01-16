import { Context, GLType, UGen, Generated, Arg } from './types';
import { ChildContextImpl } from './context';
import { memo } from './memo';

export const defun = (body: UGen, name: string): UGen => {

    let cache: Generated;

    return (context: Context): Generated => {
        if (cache) {
            return cache;
        }
        // we need a new context to store arguments, isolated from
        // other functions
        let functionContext = new ChildContextImpl(context);
        let _body = functionContext.gen(body);

        // now lets pack all of these
        let code = "";
        let i = 0;
        let _cache = {};
        _cache = { ...body };
        let _code = _body.code;
        if (!_code.includes(";")) {
            _code += ";";
        }
        code += `
${_code}

return ${_body.variable};
            `;

        cache = {
            ..._cache,
            type: _body.type,
            variables: [],
            code,
            uniforms: _body.uniforms,
            variable: name,
            functions: emitFunctions(_body), // maybe the body references even more functions
            functionArguments: emitArguments(_body),
        };
        return cache;
    };
};

export const call = (lazyFunction: Arg, ...args: Arg[]): UGen => {
    return memo((context: Context): Generated => {
        let _args: Generated[] = args.map(arg => context.gen(arg));
        if (typeof lazyFunction !== "function") {
            // todo: handle gracefully
            return _args[0];
        }

        let _func: Generated = lazyFunction(context);
        let name = _func.variable;
        let [variable] = context.useVariables(`${name}Value`);

        let printedType = context.printType(_func.type);

        // call the function w/ the invocation number
        let code = `${printedType} ${variable} = ${name}(${_args.map(x => x.variable).join(",")}); 
`;

        let generated: Generated = context.emit(_func.type, code, variable, ..._args);
        let _funcs = generated.functions === undefined ? [] : generated.functions;

        // append function
        generated.functions = [..._funcs, _func];
        generated.uniforms = [...(generated.uniforms || []), ...(_func.uniforms || [])];
        return generated;
    });
};

export const emitFunctions = (...gen: Generated[]): Generated[] => {
    let generated = new Set<Generated>();
    for (let x of gen) {
        if (x.functions) {
            for (let func of x.functions) {
                generated.add(func);
            }
        }
    }
    return Array.from(generated);
};

export const emitArguments = (...gen: Generated[]): Argument[] => {
    let generated = new Set<Argument>();
    for (let x of gen) {
        if (x.functionArguments) {
            for (let funcArg of x.functionArguments) {
                generated.add(funcArg);
            }
        }
    }
    return Array.from(generated);
};

// when argument is called we need to simply just use its name...

export interface Argument {
    name: string;
    num: number;
    type: GLType;
}

export const argument = (name: string, num: number, type: GLType): UGen => {
    return memo((context: Context): Generated => {
        let [_var] = context.useVariables("funcArg");
        let out = `${context.printType(type)} ${_var} = ${name}; `;
        let generated: Generated = context.emit(type, out, _var);
        let args = [...(generated.functionArguments || []), { name, num, type }];
        // dedupe
        args = Array.from(new Set(args));
        generated.functionArguments = args;
        return generated;
    });
}
