import {
    s,
    selector,
    input,
    accum, float, phasor, zen, history, ParamGen, Arg, History, UGen
} from '../../../zen/index';
import { Component } from '../../../zen/physical-modeling/Component';
import { message } from '../../../zen/message';
import { zdf } from '../../../zen/filters/zdf';
import { svf } from '../../../zen/filters/svf';
import { biquad, biquadI } from '../../../zen/filters/biquad';
import { vactrol, onepole } from '../../../zen/filters/onepole';
import { compressor } from '../../../zen/compressor';
import { fixnan, elapsed, dcblock } from '../../../zen/utils';
import { simdMatSum } from '../../../zen/simd';
import { PhysicalModel } from './physical-modeling/types';
import { createSpiderWeb, SpiderWeb } from '../../../zen/physical-modeling/web-maker';
import { Material } from '../../../zen/physical-modeling/spider-web';
import { click, Clicker } from '../../../zen/click';
import { Range, variable, rawSumLoop } from '../../../zen/loop'
import { nth, LazyFunction, call, defun, argument } from '../../../zen/functions';
import { sampstoms, mstosamps } from '../../../zen/utils';
import { ObjectNode } from '../../types';
import { LazyComponent } from './physical-modeling/types';
import { output } from '../../../zen/output'
import { data, clearData, poke, peek, BlockGen, Interpolation } from '../../../zen/data';
import { delta, change, rampToTrig } from '../../../zen/delta';
import { interp } from '../../../zen/interp';
import { cycle } from '../../../zen/cycle';
import { delay } from '../../../zen/delay';
import { latch } from '../../../zen/latch';
import { noise } from '../../../zen/noise';
import { scale } from '../../../zen/scale';
import { zswitch } from '../../../zen/switch';
import { triangle } from '../../../zen/triangle';
import { sine } from '../../../zen/unit';
import { gate } from '../../../zen/gate';
import { t60 } from '../../../zen/t60';
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
} from '../../../zen/math';
import { AccumParams } from '../../../zen/accum';
import { CompoundOperator, CustomParams, Operator, Statement } from './types';


const output_f = output;

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

export const printStatement = (statement: Statement): string => {
    if (statement === undefined) {
        return "";
    }
    if ((statement as Component).material) {
        return "component";
    }
    let variables: Variables = {};
    let blocks: BlockGen[] = [];
    let histories: History[] = [];
    let body = _printStatement(statement, variables, 0, histories, blocks);
    let _variables = Object.values(variables).sort((a, b) => a.idx - b.idx);
    let varOut = '';
    for (let i = 0; i < histories.length; i++) {
        varOut += `let history${i} = history();
`;
    }
    for (let i = 0; i < blocks.length; i++) {
        let interpolation = blocks[i].interpolation === "none" ? "none" : "linear";
        if (blocks[i].getInitData!()) {
            let str = "[" + Array.from(blocks[i].getInitData!()).join(',') + "]";
            let size = blocks[i].getSize!();
            let channels = blocks[i].getChannels!();
            varOut += `let data${i} = data(${size}, ${channels}, new Float32Array(${str}), true, "${interpolation}");
`;
        } else {
            let size = blocks[i].getSize!();
            let channels = blocks[i].getChannels!();
            varOut += `let data${i} = data(${size}, ${channels}, undefined, true, "${interpolation}");
`; //, new Float32Array(${str}));
        }
    }
    for (let variable of _variables) {
        varOut += "let " + variable.name + " = " + variable.printed + ";\n";
    }
    return varOut + "return " + body;

}

const printVariables = (variables: Variables, prefix = ""): string => {
    let _variables = Object.values(variables).sort((a, b) => a.idx - b.idx);
    let varOut = "";
    for (let variable of _variables) {
        varOut += prefix + "let " + variable.name + " = " + variable.printed + ";\n";
    }
    return varOut;
}

type Variables = {
    [id: string]: Variable;
}

interface Variable {
    idx: number;
    name: string;
    printed: string;
}

export const getVariableName = (op: string, idx: number, zobject: ObjectNode): string => {
    if (zobject.attributes["scripting name"]) {
        let scriptingName = zobject.attributes["scripting name"];
        //scriptingName = scriptingName.replaceAll("-", "_");
        //scriptingName = scriptingName.replaceAll(".", "_");
        //scriptingName = scriptingName.replaceAll(" ", "_");
        //scriptingName = scriptingName.replaceAll("/", "_");
        //scriptingName = scriptingName.replaceAll("?", "");
        let idx = zobject.id.replaceAll("-", "").slice(0, 6);
        return `${op}_${idx}_${scriptingName}`;
    }
    return `${op}${idx}`;
};

export const _printStatement = (
    statement: Statement,
    variables: Variables,
    deep = 0,
    histories: History[] = [],
    blocks: BlockGen[]
): string => {
    if (typeof statement === "number") {
        return (statement as number).toString();
    }

    if (!Array.isArray(statement)) {
        return "";
    }
    let [operator, ...statements] = statement;
    let op: string = (operator as CompoundOperator).name || operator as string;

    let zobject = statement.node!;
    if (zobject && variables[zobject.id] !== undefined) {
        return variables[zobject.id].name
    }

    let opArgs = "";
    if ((operator as CompoundOperator).history) {
        let h = (operator as CompoundOperator).history as unknown as History;
        if (histories.includes(h)) {
            op = op + histories.indexOf(h);
        } else {
            op = op + histories.length;
            histories.push(h);
        }
    }

    let _name = (operator as CompoundOperator).name;
    let firstArg = "";
    let created = false;
    if (_name === "peek" || _name === "poke" || _name === "clearData") {
        let data = (operator as CompoundOperator).params as BlockGen;
        if (!blocks.includes(data)) {
            blocks.push(data);
            created = true;
        }
        firstArg = "data" + blocks.indexOf(data); //(blocks.length - 1);
    }


    let finalArgs: string = "";
    if (_name === "round") {
        // need the round mode
        finalArgs = `,"${(operator as CompoundOperator).params as RoundMode}"`;
    }
    if (_name === "accum") {
        finalArgs = `,${JSON.stringify((operator as CompoundOperator).params as AccumParams)}`;
    }

    if (_name === "output") {
        finalArgs = `,${(operator as CompoundOperator).outputNumber}`;
    }
    if (_name === "modeling.play") {
        let [a, b] = (operator as CompoundOperator).physicalModel!;
        let trig = _printStatement((statement as Statement[])[1], variables, deep + 1, histories, blocks);
        let mix = _printStatement((statement as Statement[])[2], variables, deep + 1, histories, blocks);
        let A = printPhysicalModel(a, variables, deep, histories, blocks);
        let B = printPhysicalModel(b, variables, deep, histories, blocks, false);
        return printModelConnect(A, B, variables, trig, mix, statement.node!);
    }


    if (_name === "variable") {
        return `variable("${(operator as CompoundOperator).variableName as string}")`;
        //opArgs = `"${(operator as CompoundOperator).variableName as string}"`;
    }

    let exactArgs: string | undefined;
    if (_name === "argument") {
        //return `argument(${(operator as CompoundOperator).value}, "${(operator as CompoundOperator).variableName as string}")`;
        //opArgs = `"${(operator as CompoundOperator).variableName as string}"`;
        exactArgs = `${(operator as CompoundOperator).value}, "${(operator as CompoundOperator).variableName as string}"`;
    }

    if ((operator as CompoundOperator).value !== undefined) {
        opArgs = ((operator as CompoundOperator).value!).toString();
        if (zobject && (zobject as any).presetManager) {
            if ((zobject as any).presetManager.presets.some((x: any) => x[(zobject as any).id])) {
                // its contained in a preset so place the variable name as the output
                opArgs = getVariableName("p", 0, zobject);
            }
        }
    }

    let output: string = "";
    if (exactArgs) {
        output = `${op}(${exactArgs})`;
    } else if ((_name === "rawSumLoop" || _name === "sumLoop") && (operator as CompoundOperator).range) {
        //let _variables: Variables = {};
        let _body = _printStatement(statements[0] as Statement, variables, deep + 1, histories, blocks);
        output = `${_name} (${JSON.stringify((operator as CompoundOperator).range)}, ${_body},
        "${(operator as CompoundOperator).variableName}")
        `;
    } else if (_name === "message") {
        let comp = operator as CompoundOperator;
        let name = comp.params;
        output = `message("${name}", ${printDeep(deep)}${statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    } else if (_name === "call") {
        let _statements = [statements[0], (operator as CompoundOperator).value, ...statements.slice(1)];
        output = `call(${firstArg ? firstArg + ", " : ""}
${printDeep(deep)}${_statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    } else if (_name === "defun") {
        let _statements = statements;
        let custom = (operator as CompoundOperator);

        output = `defun("${custom.variableName}", ${custom.value},
${printDeep(deep)}${_statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    } else if (statements.length === 0) {
        output = `${op} (${opArgs})`;
    } else {
        output = `${op} (${firstArg ? firstArg + ", " : ""}
${printDeep(deep)}${statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    }

    if (zobject) {
        if (!variables[zobject.id]) {
            let idx = Object.keys(variables).length;
            let name = getVariableName(op, idx, zobject); //`${op}${idx} `;
            variables[zobject.id] = {
                idx,
                name,
                printed: output
            };
        }
        if (variables[zobject.id] !== undefined) {
            output = variables[zobject.id].name
        }
    }

    return output;
}

const printDeep = (deep: number) => {
    let out = '    ';
    return out;
    for (let i = 0; i < deep; i++) {
        out += "  ";
    }
    return out;
};

type CompiledStatements = {
    [id: string]: UGen;
}

export const compileStatement = (statement: Statement, compiled: CompiledStatements = {}): UGen => {
    let _compiled = _compileStatement(statement);
    return _compiled;
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

export const _compileStatement = (statement: Statement, compiled: CompiledStatements = {}, depth = 0, zobjects: ObjectNode[] = []): UGen => {
    if (typeof statement === "number") {
        return float(statement as number);
    }

    if (statement && (statement as BlockGen).getSize) {
        return statement as any;
    }

    if (!Array.isArray(statement)) {
        return float(0);
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
    let compiledArgs = statements.filter(x => x !== undefined).map(arg => _compileStatement(arg as Statement, compiled, depth + 1, newList));
    if (zobject && compiled[zobject.id]) {
        //let _depth = calculateDepth(statement);
        //if (!_depth.some(x => x[0] && x[0].name === "history")) {
        return compiled[zobject.id];
        //}
    }



    let zenOperator: ZenFunction = getZenOperator(operator);
    let output: UGen | undefined = undefined;
    let _name = "";
    if (isSimpleFunction(zenOperator)) {
        output = (zenOperator as SimpleFunction)(...compiledArgs);
    } else {
        // a few functions require a bespoke params field to work
        let compoundOperator = operator as CompoundOperator;
        let name = compoundOperator.name;
        if (name === "phasor") {
            console.log('calling phasor with compiled args=', compiledArgs);
            output = phasor(compiledArgs[0], compiledArgs[1], compoundOperator.params as AccumParams);
        } else if (name === "accum") {
            output = accum(compiledArgs[0], compiledArgs[1], compoundOperator.params as AccumParams);
        } else if (name === "round") {
            output = round(compiledArgs[0], compiledArgs[1], compoundOperator.params as RoundMode);
        } else if (name === "poke") {
            // data will work as is
            let blockGen = compoundOperator.params as BlockGen;
            output = poke(blockGen, compiledArgs[0], compiledArgs[1], compiledArgs[2]);
        } else if (name === "clearData") {
            // data will work as is
            let blockGen = compoundOperator.params as BlockGen;
            output = clearData(blockGen, compiledArgs[0]);
        } else if (name === "peek") {
            let blockGen = compoundOperator.params as BlockGen;
            output = peek(blockGen, compiledArgs[0], compiledArgs[1], compiledArgs[2]);
        } else if (name === "simdMatSum") {
            return simdMatSum(compoundOperator.block1!, compoundOperator.block2!);
        } else if (name === "history") {
            let hist: History = compoundOperator.history!;
            output = hist(compiledArgs[0], compiledArgs[1]);
        } else if (name === "param") {
            let param: ParamGen = compoundOperator.param!;
            output = param;
        } else if (name === "click") {
            let click: Clicker = compoundOperator.param! as Clicker;
            output = click;
        } else if (name === "output") {
            output = output_f(compiledArgs[0], compoundOperator.outputNumber!);
        } else if (name === "variable") {
            output = variable(compoundOperator.variableName!);
        } else if (name === "argument") {
            output = argument(compoundOperator.value!, compoundOperator.variableName!);
        } else if (name === "input") {
            output = input(compoundOperator.value!);
        } else if (name === "rawSumLoop") {
            let range: Range = compoundOperator.range!;
            output = rawSumLoop(range, compiledArgs[0], compoundOperator.variableName!);
        } else if (name === "defun") {
            let size: number = compoundOperator.value!;
            let name: string = compoundOperator.variableName!;
            output = defun(name, size, ...compiledArgs);
        } else if (name === "call") {
            let invocationNumber: number = compoundOperator.value!;
            let body = compiledArgs[0];
            let args = compiledArgs.slice(1);
            _name = name;
            output = call(body as LazyFunction, invocationNumber, ...args);
        } else if (name === "message") {
            output = message(compoundOperator.params as string, compiledArgs[0], compiledArgs[1]);
        } else if (name === "modeling.play") {
            let components: Component[] = [];
            for (let component of compoundOperator.physicalModel!) {
                let { web, material } = component;
                let pitch = _compileStatement(material.pitch as Statement, compiled, depth + 1, newList);
                let couplingCoefficient = _compileStatement(material.couplingCoefficient as Statement, compiled, depth + 1, newList);
                let release = _compileStatement(material.release as Statement, compiled, depth + 1, newList);
                let placement = _compileStatement(material.placement as Statement, compiled, depth + 1, newList);
                let noise = _compileStatement(material.noise as Statement, compiled, depth + 1, newList);
                let x = _compileStatement(material.x as Statement, compiled, depth + 1, newList);
                let y = _compileStatement(material.y as Statement, compiled, depth + 1, newList);
                let _material = {
                    pitch,
                    release,
                    placement,
                    noise,
                    couplingCoefficient,
                    x,
                    y
                };
                let comp: Component = new Component(_material, web, components.length === 0);
                components.push(comp);
            }
            if (components.length === 1) {
                output = components[0].gen(compiledArgs[0]);
            } else {
                components[0].bidirectionalConnect(components[1]);
                output = s(
                    compiledArgs[0],
                    components[0].currentChannel,
                    components[0].prevChannel,
                    components[1].currentChannel,
                    components[1].prevChannel,
                    mix(components[0].gen(compiledArgs[0]), components[1].gen(add(0)), compiledArgs[1] || 0)
                );
            }
        }
    }

    if (output !== undefined) {
        if (zobject) {
            compiled[zobject.id] = output;
        }
        return output;
    }
    return float(0);
};

export const getZenOperator = (operator: Operator): ZenFunction => {
    let operatorName: string = (operator as CompoundOperator).name ||
        operator as string;
    return api[operatorName];
};

export type SimpleFunction = (...x: Arg[]) => UGen;
export type BinaryParamFunction = (x: Arg, y?: Arg, params?: CustomParams) => UGen;
export type ZenFunction = SimpleFunction; // | BinaryParamFunction;
export type API = {
    [key: string]: ZenFunction;
};

export type BinaryAPI = {
    [key: string]: BinaryParamFunction;
};

const isSimpleFunction = (func: ZenFunction): boolean => {
    return Object.values(simpleFunctions).includes(func);
};

const simpleFunctions: API = {
    add, sub, mult, div, lt, lte, gt, gte, and, or, eq, neq, mod, abs, floor,
    ceil, sin, cos, tanh, pow, sqrt, min, max, shiftLeft, shiftRight,
    sign, mix, wrap, clamp, reciprical, not_sub, s,
    //print,
    delta, change, rampToTrig,
    latch,
    noise,
    scale,
    t60,
    zswitch,
    triangle,
    sine,
    gate,
    cycle,
    delay,
    mstosamps,
    sampstoms,
    interp,
    exp,
    xor,
    exp2,
    tan,
    dcblock,
    elapsed,
    nth,
    log2,
    zdf,
    onepole,
    vactrol,
    atan,
    compressor,
    svf,
    fixnan,
    selector,
    biquad,
    biquadI
};

const api: API = {
    ...simpleFunctions
};


const printPhysicalModel = (
    c: LazyComponent,
    variables: Variables,
    deep: number,
    histories: History[] = [],
    blocks: BlockGen[],
    isEntryPoint: boolean = true,
): string => {
    let { web, material } = c;
    let web_string = `
        {
            data: ${dataFromArray(web.coeffs!, web.size, web.size)},
            dampeningData: ${dataFromArray(web.dampening!)},
            pointsData: ${dataFromArray(web.points!)},
            maxNeighbors: ${web.maxNeighbors},
            neighborsMatrix: ${JSON.stringify(web.neighborsMatrix)},
            neighbors: ${floatArr(web.neighbors)},
            size: ${web.size},
            radius: ${web.radius}
        }
        `;
    let couplingCoefficient = _printStatement(
        material.couplingCoefficient,
        variables,
        deep + 1,
        histories,
        blocks);
    let pitch = _printStatement(
        material.pitch,
        variables,
        deep + 1,
        histories,
        blocks);
    let release = _printStatement(
        material.release,
        variables,
        deep + 1,
        histories,
        blocks);
    let x = _printStatement(
        material.x,
        variables,
        deep + 1,
        histories,
        blocks);
    let y = _printStatement(
        material.y,
        variables,
        deep + 1,
        histories,
        blocks);
    let noise = _printStatement(
        material.noise,
        variables,
        deep + 1,
        histories,
        blocks);


    let material_string = `
        {
            noise: ${noise},
            couplingCoefficient: ${couplingCoefficient},
            x: ${x || 0},
            y: ${y || 0},
            pitch: ${pitch},
            release: ${release}
        }
        `;
    let component_string = `new Component(${material_string}, ${web_string}, ${isEntryPoint})`;
    return component_string;
};

const dataFromArray = (ar: Float32Array, size = ar.length, channels = 1) => {
    let str = "[" + Array.from(ar).join(',') + "]";
    //let size = ar.length;
    //let channels = 1;
    return `data(${size}, ${channels}, new Float32Array(${str}))`;
};

const floatArr = (ar: Float32Array) => {
    let str = "[" + Array.from(ar).join(',') + "]";
    return `new Float32Array(${str})`;
};

const printModelConnect = (
    a: string,
    b: string,
    variables: Variables,
    trigger: string,
    mix: string,
    zobject: ObjectNode) => {
    let idx = Object.keys(variables).length;
    let nameA = `model${idx} `;
    let nameB = `model${idx + 1} `;
    let nameC = `model${idx + 2} `;
    variables[idx] = {
        idx,
        name: nameA,
        printed: a
    };
    variables[idx + 1] = {
        idx,
        name: nameB,
        printed: b
    };
    let bid = `${nameA}.bidirectionalConnect(${nameB}); `;
    variables[idx + 2] = {
        idx,
        name: nameC,
        printed: bid
    };
    let output = `s(
            ${trigger},
            ${nameA}.currentChannel,
            ${nameA}.prevChannel,
            ${nameB}.currentChannel,
            ${nameB}.prevChannel,
            mix(${nameA}.gen(${trigger}), ${nameB}.gen(add(0)), ${mix})
        )`;

    /*
    let nameD = `model${ idx + 3 } `;
    console.log('adding model to zobject.id=', zobject.id, variables);
    variables[zobject.id] = {
        idx,
        name: nameD,
        printed: output
    };
    */
    return output;
};
