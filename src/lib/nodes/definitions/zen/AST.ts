import {
    s,
    selector,
    input,
    accum, float, phasor, zen, history, ParamGen, Arg, History, UGen
} from '../../../zen/index';
import { FunctionEditor } from "@/lib/nodes/definitions/core/function";
import { traverseBackwards } from '@/lib/nodes/traverse';
import { Component } from '../../../zen/physical-modeling/Component';
import { condMessage, message } from '../../../zen/message';
import { zdf } from '../../../zen/filters/zdf';
import { svf } from '../../../zen/filters/svf';
import { biquad, biquadI } from '../../../zen/filters/biquad';
import { vactrol, onepole } from '../../../zen/filters/onepole';
import { compressor } from '../../../zen/compressor';
import { fixnan, elapsed, dcblock } from '../../../zen/utils';
import { simdDot, simdDotSum, simdMatSum } from '../../../zen/simd';
import { PhysicalModel } from './physical-modeling/types';
import { createSpiderWeb, SpiderWeb } from '../../../zen/physical-modeling/web-maker';
import { Material } from '../../../zen/physical-modeling/spider-web';
import { click, Clicker } from '../../../zen/click';
import { Range, variable, rawSumLoop } from '../../../zen/loop'
import { invocation, nth, LazyFunction, latchcall, call, defun, argument } from '../../../zen/functions';
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

interface BlockNode {
    data: BlockGen;
    node: ObjectNode;
}
export const printStatement = (statement: Statement): string => {
    if (statement === undefined) {
        return "";
    }
    if ((statement as Component).material) {
        return "component";
    }
    let variables: Variables = {};
    let blocks: BlockNode[] = [];
    let histories: History[] = [];
    let body = _printStatement(statement, variables, 0, histories, blocks);
    let _variables = Object.values(variables).sort((a, b) => a.idx - b.idx);
    let varOut = '';
    for (let i = 0; i < histories.length; i++) {
        varOut += `let history${i} = history();
`;
    }
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i].data;
        let interpolation = block.interpolation === "none" ? "none" : "linear";
        let functions = blocks[i].node ? traverseBackwards(blocks[i].node).filter(x => (x as ObjectNode).name === "function") : [];
        let initData: Float32Array | number[] = block.getInitData!();
        let needsInterpolation = false;
        if (functions.length > 0) {
            let func = functions[0];
            let editor = ((func as ObjectNode).custom as FunctionEditor);
            if (editor) {
                let pts = [];
                for (let point of editor.points) {
                    pts.push(Math.round(1000 * point.x) / 1000);
                    pts.push(Math.round(1000 * point.y) / 1000);
                    if (point.c !== undefined) {
                        pts.push(Math.round(1000 * point.c) / 1000);
                    } else {
                        pts.push(0);
                    }
                }
                let a = Math.round(100 * pts[pts.length - 3]) / 100;
                let b = Math.round(100 * pts[pts.length - 2]) / 100;
                let c = Math.round(100 * pts[pts.length - 1]) / 100;
                pts.push(a + 1);
                pts.push(b);
                pts.push(c);
                initData = pts;
                console.log("PTS=", pts);
                needsInterpolation = true;
            }
        }
        if (initData) {
            let str = "[" + Array.from(initData).join(',') + "]";
            let size = block.getSize!();
            let channels = block.getChannels!();
            if (needsInterpolation) {
                varOut += `let data${i} = data(${size}, ${channels}, interpolateCurve(${str}), true, "${interpolation}");
`
            } else {
                varOut += `let data${i} = data(${size}, ${channels}, new Float32Array(${str}), true, "${interpolation}");
            `;
            }
        } else {
            let size = block.getSize!();
            let channels = block.getChannels!();
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
        return `${op}_${idx}_${scriptingName} `;
    }
    if (op.includes("history")) {
        op = op.replace("history", "hist");
    }
    return `${op}${idx} `;
};

export const _printStatement = (
    statement: Statement,
    variables: Variables,
    deep = 0,
    histories: History[] = [],
    blocks: BlockNode[]
): string => {
    if (typeof statement === "number") {
        return (statement as number).toString();
    }
    if (typeof statement === "string") {
        return "\"" + (statement as string) + "\"";
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
        if (!blocks.some((x) => x.data === data)) {
            blocks.push({ data, node: zobject });
            created = true;
        }
        let indexOf = -1;
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].data === data) {
                indexOf = i;
            }
        }
        firstArg = "data" + indexOf;
    }


    let finalArgs: string = "";
    if (_name === "round") {
        // need the round mode
        finalArgs = `, "${(operator as CompoundOperator).params as RoundMode}"`;
    }
    if (_name === "accum") {
        finalArgs = `, ${JSON.stringify((operator as CompoundOperator).params as AccumParams)} `;
    }

    if (_name === "output") {
        finalArgs = `, ${(operator as CompoundOperator).outputNumber} `;
    }
    if (_name === "modeling.synth") {
        let component = (operator as CompoundOperator).modelComponent!;
        let components = (operator as CompoundOperator).modelComponents!;

        let trig = _printStatement((statement as Statement[])[1], variables, deep + 1, histories, blocks);
        //let mix = _printStatement((statement as Statement[])[2], variables, deep + 1, histories, blocks);

        let printedModels = components.map(x => printPhysicalModel(x, variables, deep, histories, blocks));
        let modelIndex = components.indexOf(component);
        return printModelConnect(printedModels, variables, trig, component, statement.node!, modelIndex);
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
        output = `${op} (${exactArgs})`;
    } else if ((_name === "rawSumLoop" || _name === "sumLoop") && (operator as CompoundOperator).range) {
        //let _variables: Variables = {};
        let _body = _printStatement(statements[0] as Statement, variables, deep + 1, histories, blocks);
        output = `${_name} (${JSON.stringify((operator as CompoundOperator).range)}, ${_body},
        "${(operator as CompoundOperator).variableName}")
        `;
    } else if (_name === "param" && (zobject.attributes["onchain"] || zobject.storedParameterValue !== undefined)) {
        if (zobject.attributes["onchain"]) {
            output = `param(${zobject.arguments[0]})`;
        } else {
            let compoundOperator = operator as CompoundOperator;
            output = `${zobject.storedParameterValue || 0}`;
        }
    } else if (_name === "message" || _name === "condMessage") {
        let comp = operator as CompoundOperator;
        let name = comp.params;
        output = `${_name} ("${name}", ${printDeep(deep)}${statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    } else if (_name === "call") {
        let _statements = [statements[0], (operator as CompoundOperator).value, ...statements.slice(1)];
        output = `call(${firstArg ? firstArg + ", " : ""}
${printDeep(deep)}${_statements.filter(x => x !== undefined).map(x => _printStatement(x as Statement, variables, deep + 1, histories, blocks)).join(',\n' + printDeep(deep))}${finalArgs})`;
    } else if (_name === "latchcall") {
        let _statements = [statements[0], (operator as CompoundOperator).value, ...statements.slice(1)];
        output = `latchcall(${firstArg ? firstArg + ", " : ""}
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
            let name = getVariableName(op, idx, zobject); //`${ op }${ idx } `;

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

export const compileStatement = (statement: Statement, _api = api, _simpleFunctions = simpleFunctions): UGen | (() => string | number) => {
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

export const _compileStatement = (statement: Statement, compiled: CompiledStatements = {}, depth = 0, zobjects: ObjectNode[] = [], _api: API, _simpleFunctions: API): Arg | (() => string | number) => {
    if (!statement.node) {
        //console.log("no node for statement", statement);
    }
    if (typeof statement === "number") {
        if (_api === api) {
            //return float(statement as number);
            return statement as number;
        } else {
            return () => (statement as number);
        }
    }
    if (typeof statement === "string") {
        return () => (statement as string);
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
    let compiledArgs = statements.filter(x => x !== undefined).map(arg => _compileStatement(arg as Statement, compiled, depth + 1, newList, _api, _simpleFunctions));
    if (zobject && compiled[zobject.id]) {
        //let _depth = calculateDepth(statement);
        //if (!_depth.some(x => x[0] && x[0].name === "history")) {
        //console.log('cached compiled already=', zobject.id, statement);
        return compiled[zobject.id];
        //}
    }



    let zenOperator: ZenFunction | OnchainFunction = getZenOperator(operator, _api);
    let output: UGen | undefined = undefined;
    let _name = "";
    if (isSimpleFunction(zenOperator, _simpleFunctions)) {
        output = (zenOperator as SimpleFunction)(...compiledArgs as Arg[]);
    } else {
        // a few functions require a bespoke params field to work
        let compoundOperator = operator as CompoundOperator;
        let name = compoundOperator.name;
        if (name === "phasor") {
            output = phasor(compiledArgs[0] as Arg, compiledArgs[1] as Arg, compoundOperator.params as AccumParams);
        } else if (name === "accum") {
            output = accum(compiledArgs[0] as Arg, compiledArgs[1] as Arg, compoundOperator.params as AccumParams);
        } else if (name === "round") {
            output = round(compiledArgs[0] as Arg, compiledArgs[1] as Arg, compoundOperator.params as RoundMode);
        } else if (name === "poke") {
            // data will work as is
            let blockGen = compoundOperator.params as BlockGen;
            output = poke(blockGen, compiledArgs[0] as Arg, compiledArgs[1] as Arg, compiledArgs[2] as Arg);
        } else if (name === "clearData") {
            // data will work as is
            let blockGen = compoundOperator.params as BlockGen;
            output = clearData(blockGen, compiledArgs[0] as Arg);
        } else if (name === "peek") {
            let blockGen = compoundOperator.params as BlockGen;
            output = peek(blockGen, compiledArgs[0] as Arg, compiledArgs[1] as Arg, compiledArgs[2] as Arg);
        } else if (name === "simdMatSum") {
            return simdMatSum(compoundOperator.block1!, compoundOperator.block2!);
        } else if (name === "simdDotSum") {
            return simdDotSum(compoundOperator.block1!, compoundOperator.block2!);
        } else if (name === "simdDot") {
            return simdDot(compoundOperator.block1!, compoundOperator.block2!, compiledArgs[0] as Arg, compiledArgs[1] as Arg);
        } else if (name === "history") {
            let hist: History = compoundOperator.history!;
            output = hist(compiledArgs[0] as UGen, compiledArgs[1] as UGen);
        } else if (name === "param") {
            let param: ParamGen = compoundOperator.param!;
            output = param;
        } else if (name === "click") {
            let click: Clicker = compoundOperator.param! as Clicker;
            output = click;
        } else if (name === "output") {
            output = output_f(compiledArgs[0] as Arg, compoundOperator.outputNumber!);
        } else if (name === "variable") {
            output = variable(compoundOperator.variableName!);
        } else if (name === "argument") {
            output = argument(compoundOperator.value!, compoundOperator.variableName!);
        } else if (name === "input") {
            output = input(compoundOperator.value!);
        } else if (name === "rawSumLoop") {
            let range = compoundOperator.range!;
            output = rawSumLoop(range as Range, compiledArgs[0] as UGen, compoundOperator.variableName!);
        } else if (name === "defun") {
            let size: number = compoundOperator.value!;
            let name: string = compoundOperator.variableName!;
            output = defun(name, size, ...compiledArgs as UGen[]);
        } else if (name === "call") {
            let invocationNumber: number = compoundOperator.value!;
            let body = compiledArgs[0];
            let args = compiledArgs.slice(1);
            _name = name;
            output = call(body as LazyFunction, invocationNumber, ...args as UGen[]);
        } else if (name === "latchcall") {
            let invocationNumber: number = compoundOperator.value!;
            let body = compiledArgs[0];
            let args = compiledArgs.slice(1);
            _name = name;
            let _args = args as UGen[];
            output = latchcall(body as LazyFunction, invocationNumber, _args[0], ..._args.slice(1));
        } else if (name === "message") {
            output = message(compoundOperator.params as string, compiledArgs[0] as Arg, compiledArgs[1] as Arg);
        } else if (name === "condMessage") {
            output = condMessage(compoundOperator.params as string, compiledArgs[0] as Arg, compiledArgs[1] as Arg, compiledArgs[2] as Arg);
        } else if (name === "modeling.synth") {
            let { modelComponent, modelComponents } = compoundOperator;
            if (modelComponent && modelComponents) {
                for (let lazyComponent of modelComponents) {
                    let { component } = lazyComponent;
                    if (component === undefined) {
                        let { web, material } = lazyComponent;
                        let pitch = _compileStatement(material.pitch as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                        let couplingCoefficient = _compileStatement(material.couplingCoefficient as Statement, compiled, depth + 1, newList, _api, _simpleFunctions)
                        let release = _compileStatement(material.release as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                        let noise = _compileStatement(material.noise as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                        let x = _compileStatement(material.x as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                        let y = _compileStatement(material.y as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                        let _material = {
                            pitch,
                            release,
                            noise,
                            couplingCoefficient,
                            x,
                            y
                        };
                        lazyComponent.component = new Component(_material as any, web, lazyComponent === modelComponents[0]);
                    }
                }
                let i = 0;
                for (let lazyComponent of modelComponents) {
                    let { component } = lazyComponent;
                    if (component && lazyComponent.connection && !component.connections.some(x => lazyComponent.connection && x.component === lazyComponent.connection.component)) {
                        let componentToConnect = lazyComponent.connection.component;
                        if (componentToConnect) {
                            component?.bidirectionalConnect(componentToConnect);
                        }
                    }
                    i++;
                }

                if (modelComponent && modelComponent.component) {
                    output = s(
                        compiledArgs[0] as Arg,
                        ...modelComponents.flatMap(
                            c => c.component ? [c.component.currentChannel, c.component.prevChannel] : []),
                        modelComponent.component.gen(compiledArgs[0] as UGen)
                    );
                }
            }
        } else if (name === "modeling.play") {
            let components: Component[] = [];
            for (let component of compoundOperator.physicalModel!) {
                let { web, material } = component;
                let pitch = _compileStatement(material.pitch as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                let couplingCoefficient = _compileStatement(material.couplingCoefficient as Statement, compiled, depth + 1, newList, _api, _simpleFunctions)
                let release = _compileStatement(material.release as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                //let placement = _compileStatement(material.placement as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                let noise = _compileStatement(material.noise as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                let x = _compileStatement(material.x as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                let y = _compileStatement(material.y as Statement, compiled, depth + 1, newList, _api, _simpleFunctions);
                let _material = {
                    pitch,
                    release,
                    //placement,
                    noise,
                    couplingCoefficient,
                    x,
                    y
                };
                let comp: Component = new Component(_material as any, web, components.length === 0);
                components.push(comp);
            }
            if (components.length === 1) {
                output = components[0].gen(compiledArgs[0] as UGen);
            } else {
                components[0].bidirectionalConnect(components[1]);
                output = s(
                    compiledArgs[0] as Arg,
                    components[0].currentChannel,
                    components[0].prevChannel,
                    components[1].currentChannel,
                    components[1].prevChannel,
                    mix(components[0].gen(compiledArgs[0] as UGen), components[1].gen(add(0)), (compiledArgs[1] as UGen) || 0)
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

export const getZenOperator = (operator: Operator, _api: API = api): ZenFunction | OnchainFunction => {
    let operatorName: string = (operator as CompoundOperator).name ||
        operator as string;
    return _api[operatorName];
};

export type SimpleFunction = (...x: Arg[]) => UGen;
export type BinaryParamFunction = (x: Arg, y?: Arg, params?: CustomParams) => UGen;
export type ZenFunction = SimpleFunction; // | BinaryParamFunction;

export type OnchainArg = string | (() => string);
export type OnchainFunction = (...x: OnchainArg[]) => () => string;

export type API = {
    [key: string]: ZenFunction | OnchainFunction
};

export type BinaryAPI = {
    [key: string]: BinaryParamFunction;
};

const isSimpleFunction = (func: ZenFunction | OnchainFunction, _simpleFunctions: API): boolean => {
    return Object.values(_simpleFunctions).includes(func);
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
    invocation,
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
    blocks: BlockNode[],
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
    models: string[],
    variables: Variables,
    trigger: string,
    component: LazyComponent,
    zobject: ObjectNode,
    modelIndex: number
) => {
    let id = zobject.id.slice(0, zobject.id.indexOf("_"));
    let idx = Object.keys(variables).length;
    let i = 0;
    let names = [];
    for (; i < models.length; i++) {
        let name = `model${id + i} `;
        names.push(name);
        if (Object.values(variables).some(x => x.name === name)) {
            continue;
        }
        variables[idx + i] = {
            idx: idx + i,
            name: name,
            printed: models[i]
        };
    }
    for (let j = 0; j < models.length - 1; j++) {
        let a = names[j];
        let b = names[j + 1];
        let bid = `!${a}.connections.some(x => x.component === ${b}) ? ${a}.bidirectionalConnect(${b}) : 0; `;
        let name = `model${id + i + j} `;
        if (Object.values(variables).some(x => x.name === name)) {
            continue;
        }
        variables[idx + j + i] = {
            idx: idx + j + i,
            name,
            printed: bid
        };
    }

    let output = `s(
        ${trigger},
        ${names.map(name => name + '.currentChannel, ' + name + '.prevChannel')},
        ${names[modelIndex]}.gen(${trigger})
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

