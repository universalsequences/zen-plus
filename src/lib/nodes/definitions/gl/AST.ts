import {
    Arg, UGen, stringToType,
} from '@/lib/gl/types';
import { ObjectNode } from '@/lib/nodes/types';
import * as gl from '@/lib/gl/index';
import { CompoundOperator, CustomParams, Operator, Statement } from '../zen/types';


/**
 * 
 * The Patcher should construct an AST that can then be evaluated into "zen" 
 * function calls only upon the COMPILATION stage. This also allows us to 
 * properly understand  how things work.
 *
 * Inspired by lisp
 *
 * Example:
 *   [MULT, 5, 4] -> mult(5, 4)
 *
 */

/**
 * Some zen functions require a bespoke "params" object (like round/accum)
 * Add the params as an optional parameter in the CompoundOperator typex
 */

// for the compilation we need to convert a Statement into a UGen

type Variables = {
    [id: string]: Variable;
}

interface Variable {
    idx: number;
    name: string;
    printed: string;
}

type CompiledStatements = {
    [id: string]: UGen;
}

export const compileStatement = (statement: Statement): UGen | string | gl.GLType => {
    let _compiled = _compileStatement(statement, undefined, undefined, undefined, api, simpleFunctions);
    return _compiled as UGen;
}

export const calculateDepth = (statement: Statement): Statement[] => {
    if (typeof statement === "number") {
        return [statement];
    }
    if (statement === undefined || !Array.isArray(statement)) {
        return [];
    }
    let [op, ...args] = statement;

    if (args.length === 0) {
        return [statement];
    }
    let treeDepths = args.map(x => calculateDepth(x as Statement));
    treeDepths.sort((a, b) => b.length - a.length);
    if (treeDepths.length === 0) {
        return [statement];
    }
    return [statement, ...treeDepths[0]];
};

export const getZObjects = (statement: Statement,): ObjectNode[] => {
    if (typeof statement === "number") {
        return [];
    }
    if (statement === undefined || !Array.isArray(statement)) {
        return [];
    }

    let [operator, ...statements] = statement;


    let zobject = statement.node;

    let recu = statements.flatMap(arg => getZObjects(arg as Statement));
    if (zobject) {
        return [zobject, ...recu];
    } else {
        return recu;
    }
};

export const _compileStatement = (statement: Statement, compiled: CompiledStatements = {}, depth = 0, zobjects: ObjectNode[] = [], _api: API, _simpleFunctions: API): UGen | string => {
    if (typeof statement === "number") {
        return gl.float(statement as number);
    }

    if (typeof statement === "string") {
        return statement;
    }

    if (!Array.isArray(statement)) {
        return gl.float(0);
    }
    let [operator, ...statements] = statement;

    let zobject = statement.node;
    let compoundOperator = operator as CompoundOperator;
    let name = compoundOperator.name;

    if (zobject && compiled[zobject.id]) {
        return compiled[zobject.id];
    }

    let filtered = zobjects.filter(x => x !== zobject);

    if (filtered.length > 16) {
        // theres at least four then just return 1
        // return float(0);
    }

    let newList = zobject ? [zobject, ...zobjects] : zobjects;

    // recursively compile the statements
    let compiledArgs = statements.filter(x => x !== undefined).map(arg => _compileStatement(arg as Statement, compiled, depth + 1, newList, _api, _simpleFunctions));
    if (zobject && compiled[zobject.id]) {
        return compiled[zobject.id];
    }



    let zenOperator: ZenFunction = getZenOperator(operator, _api);
    let output: UGen | undefined = undefined;
    let _name = "";
    if (isSimpleFunction(zenOperator, _simpleFunctions)) {
        output = (zenOperator as SimpleFunction)(...compiledArgs as UGen[]);
    } else {
        if ((operator as string) === "defun") {
            output = gl.defun(compiledArgs[0] as UGen, compiledArgs[1] as string);
        } else {
            let compoundOperator = operator as CompoundOperator;
            if (compoundOperator.name === "argument") {
                output = gl.argument(compiledArgs[0] as string, compoundOperator.value as number, stringToType(compiledArgs[1] as string));
            } else if (compoundOperator.name === "loopAccumulator") {
                output = gl.loopAccumulator(compiledArgs[0] as string, compiledArgs[1] as UGen);
            } else if (compoundOperator.name === "attribute" && compoundOperator.attribute) {
                output = compoundOperator.attribute(); // we evaluate it
            } else if (compoundOperator.name === "varying") {
                if (compoundOperator.attribute) {
                    output = gl.varying(compoundOperator.attribute()); // we evaluate it
                } else {
                    output = gl.varying(compiledArgs[0] as UGen); // we evaluate it
                }
            } else if (compoundOperator.name === "uniform" && compoundOperator.uniform) {
                output = compoundOperator.uniform();
            }
        }
    }

    if (output !== undefined) {
        if (zobject) {
            compiled[zobject.id] = output;
        }
        return output;
    }
    return gl.float(0);
};

export const getZenOperator = (operator: Operator, _api: API = api): ZenFunction => {
    let operatorName: string = (operator as CompoundOperator).name ||
        operator as string;
    return _api[operatorName];
};

export type SimpleFunction = (...x: Arg[]) => UGen;
export type BinaryParamFunction = (x: Arg, y?: Arg, params?: CustomParams) => UGen;
export type ZenFunction = SimpleFunction; // | BinaryParamFunction;


export type API = {
    [key: string]: ZenFunction
};

export type BinaryAPI = {
    [key: string]: BinaryParamFunction;
};

const isSimpleFunction = (func: ZenFunction, _simpleFunctions: API): boolean => {
    return Object.values(_simpleFunctions).includes(func);
};


let simpleFunctions: API = {}

let api: API = {
    ...simpleFunctions
};

export const registerFunction = (name: string, fn: ZenFunction) => {
    simpleFunctions[name] = fn;
    api[name] = fn;
};
