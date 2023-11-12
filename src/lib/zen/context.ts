import { Memory } from './memory-helper'
import { Block, MemoryBlock, LoopMemoryBlock } from './block'
import { Arg, Generated, float } from './zen';
import { Function } from './functions';
import { emitParams, emitHistory, emitOuterHistory } from './history'
import { emitArguments, emitFunctions } from './functions'
import { Range } from './loop';
import { Target } from './targets';

export interface IContext {
    memory: Memory;
    idx: number;
    histories: number;
    numberOfInputs: number;
    sampleRate: number;
    disposed: boolean;
}

const HEAP_SIZE = 512 * 512 * 16;

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

    constructor(target = Target.Javascript) {
        this.memory = new Memory(this, HEAP_SIZE),
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

    gen(input: Arg): Generated {
        if (input === undefined) {
            input = 0;
        }
        if (typeof input === "number") {
            return float(input)(this);
        }
        if (typeof input === "function") {
            return input(this);
        } else {
            return float(0)(this);
        }
    };

    emit(code: string, variable: string, ...args: Generated[]): Generated {
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
        let out: Generated = {
            code: emitCode(this, code, variable, ...args),
            variable,
            histories,
            outerHistories,
            params,
            variables: _variables,
            context: this,
            functions,
            functionArguments,
            isLoopDependent: loopDep
        };
        let inputs = args
            .filter(x => x.inputs !== undefined)
            .map(x => x.inputs as number);
        if (inputs.length > 0) {
            out.inputs = Math.max(...inputs);
        }
        return out;
    };

    input(inputNumber: number): string {
        if (inputNumber > this.numberOfInputs) {
            this.numberOfInputs = inputNumber;
        }
        return 'in' + inputNumber;
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
    let vout = "";
    if ((code.trim().startsWith("let") || (code.trim().startsWith("double"))) && context.isVariableEmitted(variable)) {
        return variable;
    }
    if (variable === "peekVal271") {
        console.log('setting emitted variables[%s] = true', variable, context);
    }
    context.emittedVariables[variable] = true;
    for (let gen of gens) {
        if (containsVariable(gen)) {
            vout += gen.code;

            if (gen.variable! === "peekVal271") {
                console.log('loop setting emitted variables[%s] = true', gen.variable!, context);
            }
            context.emittedVariables[gen.variable!] = true;
        } else {
        }
    }
    /*
    console.log("****************BEGIN*************");
    console.log("vout=", vout);
    console.log("code=", code);
    console.log("****************END*************");
    */
    if (variable === "peekVal271") {
        console.log('return vout=', vout + '\n' + code);
    }
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
