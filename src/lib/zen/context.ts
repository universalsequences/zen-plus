import { Memory } from "./memory-helper";
import { emitBlocks, CodeBlock, SIMDBlock } from "./simd";
import { CodeFragment, emitCode, emitCodeHelper, printCodeFragments } from "./emitter";
import { Block, MemoryBlock, LoopMemoryBlock } from "./block";
import { Arg, Generated, float } from "./zen";
import { Function } from "./functions";
import { emitParams, emitHistory, emitOutputHistory, emitOuterHistory } from "./history";
import { emitArguments, emitFunctions } from "./functions";
import type { Range } from "./loop";
import { Target } from "./targets";

export interface IContext {
  forceScalar?: boolean;
  memory: Memory;
  isSIMD: boolean;
  idx: number;
  id: number;
  histories: number;
  numberOfInputs: number;
  sampleRate: number;
  disposed: boolean;
  baseContext: Context;
  fresh: boolean;
  historyContext?: string;
}

export type ClearedMemoizedValues = {
  [id: string]: boolean;
};

export type MemoizedValues = {
  [id: number]: Generated;
};

const HEAP_SIZE = 512 * 512 * 128 * 128 * 1;

type EmittedVariables = {
  [key: string]: boolean;
};

export type ContextMessageType = "memory-set" | "memory-get" | "schedule-set" | "init-memory";

export interface ContextMessage {
  type: ContextMessageType;
  body: any;
}

type VariableNameCache = {
  [x: number]: InnerVariableNameCache;
};

type InnerVariableNameCache = {
  [x: string]: string[];
};

type ConstantArrays = {
  [x: string]: number;
};

let contextId = 0;
export class Context {
  memory: Memory;
  idx: number;
  histories: number;
  ignoreMemoization: boolean;
  functions: Function[];
  numberOfInputs: number;
  sampleRate: number;
  emittedVariables: EmittedVariables;
  worklets: AudioWorkletNode[];
  target: Target;
  disposed: boolean;
  historiesEmitted: Set<string>;
  newBase?: boolean;
  isSIMD: boolean;
  completedCycles: Set<string>;
  depth?: number;
  transformIntoContext?: Context;
  inboundDependencies?: string[];
  _isSIMD: boolean;
  baseContext: Context;
  id: number;
  forceScalar: boolean;
  context?: Context;
  fresh: boolean;
  historyContext?: string;
  variableNameCache: VariableNameCache;
  upwardContexts: Context[];
  stack: Context[];
  isFunctionCaller: boolean;

  cachedParents?: Set<Context>;

  childContexts: Context[];

  emittedStatements: Generated[];
  constantArrays: ConstantArrays;

  constructor(target = Target.Javascript, baseContext?: Context) {
    this.id = contextId++;
    this.upwardContexts = [];
    this.stack = [];
    this.isFunctionCaller = false;
    this.fresh = true;
    this.variableNameCache = {};
    this.emittedStatements = [];
    if (baseContext) {
      this.memory = baseContext.memory;
    } else {
      this.memory = new Memory(this, HEAP_SIZE);
    }
    this.childContexts = [];
    this.idx = 0;
    this.histories = 0;
    this.completedCycles = new Set();
    this.functions = [];
    this.historiesEmitted = new Set();
    this.numberOfInputs = 1;
    this.sampleRate = 44100;
    this.emittedVariables = {};
    this.worklets = [];
    this.disposed = false;
    this.target = target;
    this.isSIMD = false;
    this._isSIMD = false;
    this.ignoreMemoization = false;

    this.baseContext = baseContext || this;
    this.forceScalar = this.baseContext.forceScalar;
    this.constantArrays = {};
  }

  // used for calling SIMD functions
  useConstantArray(name: string, value: number): string {
    const [variableName] = this.useVariables(name);
    this.baseContext.constantArrays[variableName] = value;
    return variableName;
  }

  get varKeyword() {
    return this.target === Target.C ? "double" : "let";
  }

  get intKeyword() {
    return this.target === Target.C ? "int" : "let";
  }

  /**
   *
   * Each block should its own context
   * If we are already in a SIMD context, and this is a SIMD operation we return itsself
   * If we are already in a nonSIMD context and this is a non-SIMD operation, then we return itself
   * Otherwise we return a new context of the requried type
   */
  useContext(isSIMD: boolean, forceCreate = false): Context {
    if (this.forceScalar) {
      return this;
    }

    //forceCreate = false;
    if (this.isFunctionCaller) {
      forceCreate = true;
    }
    if (forceCreate || this.isSIMD !== isSIMD) {
      if (isSIMD) {
        const x = new SIMDContext(this);
        this.childContexts.push(x);
        return x;
      }
      const x = new Context(this.target, this.baseContext);
      x.context = this as Context;
      this.childContexts.push(x);
      return x;
    }
    return this;
  }

  alloc(size: number): MemoryBlock {
    console.log("alloc called");
    const loopContext: LoopContext | null = this.getLoopContextIfAny();
    console.log("get loop context if any...", loopContext);
    if (loopContext) {
      return this.loopAlloc(size, loopContext);
    }
    return this.memory.alloc(size);
  }

  loopAlloc(size: number, context: LoopContext): LoopMemoryBlock {
    let allocSize = size * context.loopSize;
    console.log("loopAlloc=", allocSize);
    const block: MemoryBlock = this.memory.alloc(size * context.loopSize);
    const index = this.memory.blocksInUse.indexOf(block);
    const _block = new LoopMemoryBlock(context, block.idx as number, block.size, size); //block.allocatedSize);
    this.memory.blocksInUse[index] = _block;
    return _block;
  }

  getLoopContextIfAny(): LoopContext | null {
    let context = this as Context;
    if ((context as LoopContext).loopSize !== undefined) {
      return context as LoopContext;
    }
    while ((context as SIMDContext).context) {
      context = (context as SIMDContext).context;
      if ((context as LoopContext).loopSize !== undefined) {
        return context as LoopContext;
      }
    }
    return null;
  }

  addWorklet(workletNode: AudioWorkletNode) {
    this.worklets.push(workletNode);
  }

  postMessage(msg: ContextMessage) {
    for (const worklet of this.worklets) {
      worklet.port.postMessage(msg);
    }
  }

  onMessage(msg: ContextMessage) {
    // look thru the blocks in use-- are any of them expecting
    // a message of this type?
    for (const block of this.memory.blocksInUse) {
      if (block.waitingForResponse === msg.type) {
        // if so, respond with the message body
        block.respond(msg.body);
      }
    }
  }

  isVariableEmitted(name: string): boolean {
    return this.emittedVariables[name] === true;
  }

  useVariables(...names: string[]): string[] {
    const idx = this.baseContext.idx++;
    return names.map((name) => `${name}${idx}`);
  }

  useCachedVariables(id: number, ...names: string[]): string[] {
    const key = names.join("+");
    if (this.baseContext.variableNameCache[id]) {
      if (this.baseContext.variableNameCache[id][key]) {
        return this.baseContext.variableNameCache[id][key];
      }
    } else {
      this.baseContext.variableNameCache[id] = {};
    }
    this.baseContext.variableNameCache[id][key] = this.useVariables(...names);
    return this.baseContext.variableNameCache[id][key];
  }

  emitVariable(name: string) {
    this.emittedVariables[name] = true;
    // this.baseContext.emittedVariables[name] = true;
  }

  gen(input: Arg, useSIMD = false): Generated {
    if (input === undefined) {
      input = 0;
    }
    if (typeof input === "number") {
      if (this.isSIMD && useSIMD) {
        return this.simdFloat(input)(this);
      }
      return float(input)(this);
    }
    if (typeof input === "function") {
      return input(this);
    }
    return float(0)(this);
  }

  simdFloat(x: number) {
    let floated = x.toString();
    if (x - Math.floor(x) === 0) {
      floated += ".0";
    }

    const [v] = this.useVariables("constantVector");
    return (context: Context) => {
      const code = `v128_t ${v}= wasm_f32x4_splat(${floated});
`;

      const codeFragment: CodeFragment = {
        variable: v,
        code: code,
        histories: [],
        dependencies: [],
        context,
      };
      return {
        isSIMD: true,
        codeFragments: [codeFragment],
        variable: v,
        variables: [],
        scalar: x,
        functions: [],
        outputHistories: [],
        functionArguments: [],
        histories: [],
        context: this,
        params: [],
        codeBlocks: [],
      };
    };
  }

  emit(code: string, variable: string, ...args: Generated[]): Generated {
    const ret = this.emitHelper(
      false,
      emitCodeHelper(false, this, code, variable, ...args),
      variable,
      ...args,
    );
    const toEmit = {
      ...ret,
    };
    this.emittedStatements.push(toEmit);
    return toEmit;
  }

  emitHelper(
    isSIMD: boolean,
    codeFragments: CodeFragment[],
    variable: string,
    ...args: Generated[]
  ): Generated {
    let histories = emitHistory(...args);
    const outputHistories = emitOutputHistory(...args);
    const functions = emitFunctions(...args);
    const functionArguments = emitArguments(...args);
    const oldOuterHistories = emitOuterHistory(...args);
    let outerHistories = Array.from(
      new Set([
        ...oldOuterHistories,
        ...histories.filter((x) => !x.includes("*") && !x.includes("loopIdx")),
      ]),
    );

    if (this.isSIMD || isSIMD) {
      outerHistories = [];
    }

    const loopDep = args.some((x) => x.isLoopDependent);

    if ("context" in this && !(this as Context).isSIMD) {
      histories = histories.filter((x) => x.includes("*"));
    }

    const params = emitParams(...args);

    let _variables = [variable];
    for (const { variable, variables } of args) {
      if (variables) {
        _variables = [..._variables, ...variables];
      }
      if (variable) {
        _variables = [..._variables, variable];
      }
    }
    let code = codeFragments
      .slice(codeFragments.length - 1)
      .map((x) => x.code)
      .join("\n");

    for (const frag of codeFragments) {
      for (const h of histories) {
        if (!frag.histories.includes(h)) {
          frag.histories.push(h);
        }
      }
    }
    const out: Generated = {
      variable,
      histories,
      outerHistories,
      params,
      variables: Array.from(new Set([variable, ...Object.keys(this.emittedVariables)])), //Array.from(new Set(_variables)).filter(x => isNaN(parseFloat(x))),
      context: this,
      functions,
      functionArguments,
      outputHistories,
      isLoopDependent: loopDep,
      codeFragments: codeFragments,
    };

    const inputs = args.filter((x) => x.inputs !== undefined).map((x) => x.inputs as number);
    if (inputs.length > 0) {
      out.inputs = Math.max(...inputs);
    }
    return out;
  }

  input(inputNumber: number): string {
    if (inputNumber + 1 > this.numberOfInputs) {
      this.numberOfInputs = inputNumber + 1;
    }
    return `in${inputNumber}`;
  }
}

export class SIMDContext extends Context {
  context: Context;

  constructor(context: Context) {
    super(context.baseContext.target, context.baseContext);
    this.context = context;
    this.memory = context.memory;
    this.idx = context.idx;
    this.histories = context.histories;
    this.numberOfInputs = context.numberOfInputs;
    this.sampleRate = context.sampleRate;
    this.emittedVariables = {}; //{ ...context.emittedVariables };
    this.worklets = context.worklets;
    this.target = context.target;
    this.isSIMD = true;
    this._isSIMD = true;
  }

  /*
    useVariables(...names: string[]): string[] {
        let parent = this.context;
        return ret;
    }
    */

  /*
    isVariableEmitted(name: string): boolean {
        // check any upstream blocks to see if we've already emmitted
        let ret = this.emittedVariables[name] === true
            || this.context.isVariableEmitted(name);
        return ret;
    }
    */

  emit(code: string, variable: string, ...args: Generated[]): Generated {
    // this gets called from non-simd operators that happen to be in a SIMDContext.
    // i.e. wer started at some SIMD-enabled operation and then when recursively evaluating its
    // args, we arrived at non-SIMD operations.

    // in this case we simply tell the emitCodeHelper that this is not SIMD (i.e. the first argument
    // of emitCodeHelper)
    let generated: Generated = super.emitHelper(
      false,
      emitCodeHelper(false, this, code, variable, ...args),
      variable,
      ...args,
    );
    this.emittedStatements.push(generated);
    return generated;
  }

  emitSIMD(code: string, variable: string, ...args: Generated[]): SIMDBlock {
    let generated: Generated = super.emitHelper(
      true,
      emitCodeHelper(true, this, code, variable, ...args),
      variable,
      ...args,
    );

    let ret: SIMDBlock = {
      isSIMD: true,
      ...generated,
    };
    this.emittedStatements.push(ret);
    return ret;
  }
}

export class LoopContext extends Context {
  loopIdx: string;
  loopSize: number;
  context: Context | LoopContext;
  isLoop: boolean;

  constructor(loopIdx: string, range: Range, context: Context | LoopContext) {
    super();
    this.isLoop = false;
    this.baseContext = context.baseContext;
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
    this.forceScalar = context.forceScalar;
  }

  /*
    useVariables(...names: string[]): string[] {
        let ret = this.context.useVariables(...names);
        return ret;
    }
    */

  isVariableEmitted(name: string): boolean {
    // check any upstream blocks to see if we've already emmitted
    let ret = this.emittedVariables[name] === true || this.context.isVariableEmitted(name);
    return ret;
  }

  alloc(size: number): MemoryBlock {
    console.log("loop context called with size=", size * this.loopSize);
    let block: MemoryBlock = this.memory.alloc(size * this.loopSize);
    let index = this.memory.blocksInUse.indexOf(block);
    let context = this.context;
    let _block = new LoopMemoryBlock(this, block.idx as number, block.size, size);
    console.log("pre block=", block, block.size, size);
    this.memory.blocksInUse[index] = _block;
    return _block;
  }
}

export { emitCodeHelper, emitCode };

export const emitOuterLoops = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.outerLoops || [])));
};

export const emitCodeBlocks = (...gen: Generated[]): CodeBlock[] => {
  return Array.from(new Set(gen.flatMap((x) => x.codeBlocks || [])));
};

const resetRoot = (codeFragment: CodeFragment, context: Context) => {
  if (codeFragment.context.id < context.id) {
    codeFragment.context = context;
  }
  codeFragment.dependencies.forEach((f) => resetRoot(f, context));
};
