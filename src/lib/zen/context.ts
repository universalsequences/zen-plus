import { Memory } from './memory-helper'
import { CodeBlock, SIMDBlock } from './simd';
import { Block, MemoryBlock, LoopMemoryBlock } from './block'
import { Arg, Generated, float } from './zen';
import { Function } from './functions';
import { emitParams, emitHistory, emitOuterHistory } from './history'
import { emitArguments, emitFunctions } from './functions'
import { Range } from './loop';
import { Target } from './targets';

export interface IContext {
    memory: Memory;
    isSIMD: boolean;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
    disposed: boolean;
}

const HEAP_SIZE = 512 * 512 * 128 * 2;

type EmittedVariables = {
    [key: string]: boolean;
};

export type ContextMessageType = "memory-set" | "memory-get" | "schedule-set" | "init-memory";

export interface ContextMessage {
    type: ContextMessageType;
    body: any;
}

export class Context {
    memory: Memory;
    idx: number;
    histories: number;
    functions: Function[];
    numberOfInputs: number;
    sampleRate: number;
    emittedVariables: EmittedVariables;
    worklets: AudioWorkletNode[];
    target: Target;
    disposed: boolean;
    historiesEmitted: string[];
    isSIMD: boolean;
    _isSIMD: boolean;

    constructor(target = Target.Javascript) {
        this.memory = new Memory(this, HEAP_SIZE);
        this.idx = 0;
        this.histories = 0;
        this.functions = [];
        this.historiesEmitted = [];
        this.numberOfInputs = 1;
        this.sampleRate = 44100;
        this.emittedVariables = {};
        this.worklets = [];
        this.disposed = false;
        this.target = target;
        this.isSIMD = false;
        this._isSIMD = false;
    }

    get varKeyword() {
        return this.target === Target.C ? "double" : "let";
    }

    get intKeyword() {
        return this.target === Target.C ? "int" : "let";
    }

    alloc(size: number): MemoryBlock {
        return this.memory.alloc(size);
    }

    addWorklet(workletNode: AudioWorkletNode) {
        this.worklets.push(workletNode);
    }

    postMessage(msg: ContextMessage) {
        this.worklets.forEach(
            worklet => worklet.port.postMessage(msg));
    }

    onMessage(msg: ContextMessage) {
        // look thru the blocks in use-- are any of them expecting
        // a message of this type?
        for (let block of this.memory.blocksInUse) {
            if (block.waitingForResponse === msg.type) {
                // if so, respond with the message body
                block.respond(msg.body);
            }
        }
    }

    isVariableEmitted(name: string): boolean {
        let x = this.emittedVariables[name] === true;
        return x;
    }

    useVariables(...names: string[]): string[] {
        let idx = this.idx++;
        return names.map(name => `${name}${idx}`);
    }

    gen(input: Arg, useSIMD = false): Generated {
        if (input === undefined) {
            input = 0;
        }
        if (typeof input === "number") {
            if (this.isSIMD && useSIMD) {
                return this.simdFloat(input)(this);
            } else {
                return float(input)(this);
            }
        }
        if (typeof input === "function") {
            return input(this);
        } else {
            return float(0)(this);
        }
    };

    simdFloat(x: number) {
        let floated = x.toString();
        if (x - Math.floor(x) === 0) {
            floated += ".0";
        }

        return (context: Context) => {
            let [v] = context.useVariables("constantVector");
            let code = `
v128_t ${v}= wasm_f32x4_splat(${floated}); 
`;
            return {
                isSIMD: true,
                code,
                variable: v,
                variables: [],
                functions: [],
                functionArguments: [],
                histories: [],
                params: [],
                codeBlocks: []
            };
        }
    };

    emit(code: string, variable: string, ...args: Generated[]): Generated {
        console.log('context emit', code, variable, args)
        return this.emitHelper(emitCodeHelper(false, this, code, variable, ...args), variable, ...args);
    };

    emitHelper(code: string, variable: string, ...args: Generated[]): Generated {
        let histories = emitHistory(...args);
        let functions = emitFunctions(...args);
        let functionArguments = emitArguments(...args);
        let oldOuterHistories = emitOuterHistory(...args);
        let outerHistories = Array.from(new Set([
            ...oldOuterHistories,
            ...histories.filter(x => !x.includes("*") && !x.includes("loopIdx"))
        ]));

        let loopDep = args.some(x => x.isLoopDependent);

        if ('context' in this) {
            histories = histories.filter(x => x.includes("*"));
        }
        let params = emitParams(...args);

        let _variables = [variable];
        for (let { variables } of args) {
            if (variables) {
                _variables = [..._variables, ...variables];
            }
        }

        let codeBlocks: CodeBlock[] = [];
        for (let gen of args) {
            if (gen.codeBlocks) {
                for (let _gen of gen.codeBlocks) {
                    let i = 0;
                    let replaced = false;
                    for (let x of codeBlocks) {
                        if (_gen.isSIMD === x.isSIMD && _gen.code.includes(x.code)) { 
                            console.log("SUPER SET CALLED", codeBlocks[i], _gen)
                            let allHistories = Array.from(new Set([...codeBlocks[i].histories, ..._gen.histories]))
                            codeBlocks[i] = _gen;
                            codeBlocks[i].histories = allHistories;
                            replaced = true;
                        }
                        i++;
                    }
                    if (!replaced) {
                        if (!codeBlocks.some(x => _gen.isSIMD === x.isSIMD && _gen.variables!.every(y => x.variables!.includes(y)))) {
                            codeBlocks.push(_gen)
                        }
                    }
                }
            }

            if (!this.isSIMD && (gen as SIMDBlock).isSIMD) {
                if (!codeBlocks.includes(gen as CodeBlock)) {
                    if (!codeBlocks.some(x => (gen as CodeBlock).isSIMD === x.isSIMD && gen.variables!.every(y => x.variables!.includes(y)))) {
                        codeBlocks.push(gen as SIMDBlock);
                    }
                }
            }

            if ((gen as CodeBlock).isSIMD) {
                if (!codeBlocks.includes(gen as CodeBlock)) {
                    if (!codeBlocks.some(x => (gen as CodeBlock).isSIMD === x.isSIMD && gen.variables!.every(y => x.variables!.includes(y)))) {
                        codeBlocks.push(gen as CodeBlock);
                    }
                }
            }
            if (this._isSIMD && (!(gen as SIMDBlock).isSIMD) && isNaN(parseFloat(gen.variable!))) {
                if (!codeBlocks.some(x => (gen as CodeBlock).isSIMD === x.isSIMD && gen.variables!.every(y => x.variables!.includes(y)))) {
                    codeBlocks = Array.from(new Set([...codeBlocks, { ...gen, isSIMD: false }]));
                }
            }
        }
        console.log("emit ", variable)
        console.log("emit checking args=", args)
        console.log("emit checking codeblocks=", codeBlocks)

        let out: Generated = {
            code: code,
            variable,
            histories,
            outerHistories,
            params,
            variables: Array.from(new Set(_variables)),
            codeBlocks,
            context: this,
            functions,
            functionArguments,
            isLoopDependent: loopDep,
        };
        let inputs = args
            .filter(x => x.inputs !== undefined)
            .map(x => x.inputs as number);
        if (inputs.length > 0) {
            out.inputs = Math.max(...inputs);
        }
        return out;
    }

    input(inputNumber: number): string {
        if (inputNumber + 1 > this.numberOfInputs) {
            this.numberOfInputs = inputNumber + 1;
        }
        return 'in' + inputNumber;
    }
}

export class SIMDContext extends Context {
    context: Context;

    constructor(context: Context) {
        super();
        this.context = context;
        this.memory = context.memory;
        this.idx = context.idx;
        this.histories = context.histories;
        this.numberOfInputs = context.numberOfInputs;
        this.sampleRate = context.sampleRate;
        this.emittedVariables = { ...context.emittedVariables };
        this.worklets = context.worklets;
        this.target = context.target;
        this.isSIMD = true;
        this._isSIMD = true;
    }

    useVariables(...names: string[]): string[] {
        //let ret = super.useVariables(...names);
        let ret = this.context.useVariables(...names);
        return ret;
    }

    isVariableEmitted(name: string): boolean {
        // check any upstream blocks to see if we've already emmitted
        let ret = this.emittedVariables[name] === true
            || this.context.isVariableEmitted(name);
        return ret;
    }

    emit(code: string, variable: string, ...args: Generated[]): Generated {
        console.log("SIMDContext.emit", variable, args, code)
        // this gets called from non-simd operators that happen to be in a SIMDContext.
        // i.e. wer started at some SIMD-enabled operation and then when recursively evaluating its
        // args, we arrived at non-SIMD operations.

        // in this case we simply tell the emitCodeHelper that this is not SIMD (i.e. the first argument
        // of emitCodeHelper)
        let generated: Generated = super.emitHelper(emitCodeHelper(false, this, code, variable, ...args), variable, ...args);
        console.log("SIMDContext.emit returning", variable, generated)
        return generated;
    }

    emitSIMD(code: string, variable: string, ...args: Generated[]): SIMDBlock {
        console.log("SIMDContext.emitSIMD", variable, args, code)
        let generated: Generated = super.emitHelper(emitCodeHelper(true, this, code, variable, ...args), variable, ...args);

        return {
            isSIMD: true,
            ...generated
        };
    }
}


export class LoopContext extends Context {
    loopIdx: string;
    loopSize: number;
    context: Context | LoopContext;

    constructor(loopIdx: string, range: Range, context: Context | LoopContext) {
        super();
        this.context = context;
        this.loopIdx = loopIdx;
        this.loopSize = (range.max as number) - (range.min as number);
        this.memory = context.memory;
        this.idx = context.idx;
        this.histories = context.histories;
        this.numberOfInputs = context.numberOfInputs;
        this.sampleRate = context.sampleRate;
        this.emittedVariables = { ...context.emittedVariables };
        this.worklets = context.worklets;
        this.target = context.target;
    }

    useVariables(...names: string[]): string[] {
        let ret = this.context.useVariables(...names);
        return ret;
    }

    isVariableEmitted(name: string): boolean {
        // check any upstream blocks to see if we've already emmitted
        let ret = this.emittedVariables[name] === true
            || this.context.isVariableEmitted(name);
        return ret;
    }

    alloc(size: number): MemoryBlock {
        let block: MemoryBlock = this.memory.alloc(size * this.loopSize);
        let index = this.memory.blocksInUse.indexOf(block);
        let context = this.context;
        let _block = new LoopMemoryBlock(
            this,
            block.idx as number,
            block.size,
            size); //block.allocatedSize);
        this.memory.blocksInUse[index] = _block;
        return _block;
    }

}



export const emitCode = (context: Context, code: string, variable: string, ...gens: Generated[]): string => {
    return emitCodeHelper(true, context, code, variable, ...gens);
}

export const emitCodeHelper = (isSIMD: boolean, context: Context, code: string, variable: string, ...gens: Generated[]): string => {
    let vout = "";
    if ((code.trim().startsWith("let") || (code.trim().startsWith("double"))) && context.isVariableEmitted(variable)) {
        return "";
    }
    context.emittedVariables[variable] = true;

    if (variable === "ltVal11") {
        console.log('ltVal11 case', code, gens, isSIMD);
    }
    if (variable === "subVal4") {
        console.log('subVal4 case', code, gens, isSIMD);
    }
    // TODO: clean this up because this is insane
    for (let gen of gens) {
        let isDebug = (gen.variable === "phasor29");
        if (isDebug) {
        console.log("DEBUG", gen, isSIMD)
        }
        if (containsVariable(gen)) {
            if (isSIMD && !context.isSIMD && (gen as SIMDBlock).isSIMD) {
                // we need to skip this block because we will turn this into a CodeBlock... 
                if (!context.emittedVariables[gen.variable!]) {
                    let _vout = `float ${gen.variable} = block_${gen.variable}[j];`;
                    if (!vout.includes(_vout)) {
                        vout += _vout;
                    }
                    if (isDebug) {
                        console.log("A", vout, gen)
                    }
                }
                context.emittedVariables[gen.variable!] = true;
            } else if (isSIMD && context.isSIMD && !(gen as SIMDBlock).isSIMD) {
                if (!context.emittedVariables[gen.variable!]) {
                    let _vout = `float ${gen.variable} = block_${gen.variable}[j];`;
                    if (!vout.includes(_vout)) {
                        vout += _vout;
                    }
                    if (isDebug) {
                        console.log("B", vout, gen)
                    }
                } 
                context.emittedVariables[gen.variable!] = true;
            } else {
                if (!isSIMD && (gen as SIMDBlock).isSIMD) {
                    let _vout = `float ${gen.variable} = block_${gen.variable}[j];`;
                    if (!vout.includes(_vout)) {
                        vout += _vout;
                    }
                    if (isDebug) {
                        console.log("C", vout, gen)
                    }
                    context.emittedVariables[gen.variable!] = true;
                } else {
                    if (!vout.includes(gen.code)) {
                        if (gen.code.includes(vout)) {
                            vout = gen.code;
                        } else {
                            vout += gen.code;
                        }
                    }
                    if (isDebug) {
                        console.log("D", vout, gen)
                    }
                    context.emittedVariables[gen.variable!] = true;
                }
            }
        } else {
        }
    }
    console.log("vout=", vout);
    console.log("code=", code);
    return vout + '\n' + code;
}



// a variable is variable referencing the code. so if they are
// the same, then this is not a vari
const containsVariable = (gen: Generated): boolean => {
    return gen.code !== gen.variable;
}


export const emitOuterLoops = (...gen: Generated[]): string[] => {
    return Array.from(new Set(gen.flatMap(x => x.outerLoops || [])));
};

export const emitCodeBlocks = (...gen: Generated[]): CodeBlock[] => {
    return Array.from(new Set(gen.flatMap(x => x.codeBlocks || [])));
};
