import {
    Arg, UGen
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

export const compileStatement = (statement: Statement, _api = api, _simpleFunctions = simpleFunctions): UGen => {
    let _compiled = _compileStatement(statement, undefined, undefined, undefined, _api, _simpleFunctions);
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

export const _compileStatement = (statement: Statement, compiled: CompiledStatements = {}, depth = 0, zobjects: ObjectNode[] = [], _api: API, _simpleFunctions: API): UGen => {
    if (!statement.node) {
        //console.log("no node for statement", statement);
    }
    if (typeof statement === "number") {
        return gl.float(statement as number);
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
        //let _depth = calculateDepth(statement);
        //if (!_depth.some(x => x[0] && x[0].name === "history")) {
        //console.log('cached compiled already=', zobject.id, statement);
        return compiled[zobject.id];
        //}
    }



    let zenOperator: ZenFunction = getZenOperator(operator, _api);
    let output: UGen | undefined = undefined;
    let _name = "";
    if (isSimpleFunction(zenOperator, _simpleFunctions)) {
        output = (zenOperator as SimpleFunction)(...compiledArgs);
    } else {
        let compoundOperator = operator as CompoundOperator;
        if (compoundOperator.name === "uniform" && compoundOperator.uniform) {
            console.log('uniform ast=', compoundOperator.uniform);
            output = compoundOperator.uniform();
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

const simpleFunctions: API = {
    '+': gl.add,
    '-': gl.sub,
    '*': gl.mult,
    'uv': gl.uv,
    'x': gl.unpack("x"),
    'y': gl.unpack("y"),
    'sin': gl.sin,
    'vec4': gl.vec4,
    'vec3': gl.vec3,
    'vec2': gl.vec2,
    'pow': gl.pow,
    '%': gl.mod,
    'dot': gl.dot,
    'length': gl.length,
    'smoothstep': gl.smoothstep,
    'step': gl.step,
};

const api: API = {
    ...simpleFunctions
};

