import { MemoryBlock } from "./block";
import { getContextWithHistory } from "./memo-simd";
import { uuid } from "./uuid";
import {
  getAllContexts,
  Memoized,
  shallowestContext,
  deepestContext,
  getParentContexts,
} from "./memo";
import { LoopContext } from "./context";
import { CodeFragment } from "./emitter";
import { UGen, Generated, Arg, float } from "./zen";
import { memo } from "./memo";
import { Context, emitCodeHelper, emitCode, ContextMessageType } from "./context";
import { emitBlocks } from "./simd";
import { emitFunctions, emitArguments } from "./functions";
import { SIMDContext } from "./index";

export type Samples = number;
interface HistoryParams {
  inline: boolean;
  name?: string;
  min?: number;
  max?: number;
}

/** Use:
    declare a history at start:
    let history1 = history();

    now use it (ex: lowpass filter):
    history1(mix(synth(), history1(), .999))
 */

// an extremely weird type: a function that happens to
// also have a field that allows for setting the value
// of the heap referenced in the history in run time
export type History = ((input?: UGen, reset?: UGen) => UGen) & {
  value?: (v: number, time?: number) => void;
  paramName?: string;
  getInitData?: () => number;
  getIdx?: () => number | undefined;
};

interface Clearer {
  clear?: () => void;
}

export type ContextualBlock = {
  block: MemoryBlock;
  context: Context;
};

const getAllCompleted = (context: Context): string[] => {
  return [
    ...Array.from(context.completedCycles),
    ...Array.from(getParentContexts(context)).flatMap((x) => Array.from(x.completedCycles)),
  ];
};

const getAllEmitted = (context: Context): string[] => {
  return [
    ...Array.from(context.historiesEmitted),
    ...Array.from(getParentContexts(context)).flatMap((x) => Array.from(x.historiesEmitted)),
  ];
};

export const history = (
  val?: number,
  params?: HistoryParams,
  debugName?: string,
  FORCENEW?: boolean,
): History => {
  let block: MemoryBlock | undefined;
  let historyVar: string | undefined;
  let cachedValue: number | undefined;
  let inMem: Generated | undefined;
  let outMem: Generated | undefined;
  let contextBlocks: ContextualBlock[] = [];
  let cachedContext: Context | undefined;
  let inputId = uuid();
  let outputId = uuid();
  let __input: Generated | undefined;

  let _history: History = (input?: Arg, reset?: Arg): UGen & Clearer => {
    const determineContext = (context: Context): Context => {
      if (cachedContext) {
        return cachedContext;
      }

      if (context.forceScalar) {
        return context;
      }

      if (params) {
        return context.useContext(false, true);
      }

      let allEmitted = new Set(getAllEmitted(context));
      let parent: Context | undefined = (context as SIMDContext).context;
      if (parent && (parent.isFunctionCaller || (FORCENEW && parent === parent.baseContext))) {
        parent = undefined;
      }
      if (parent && allEmitted.size > 0) {
        let contexts: Set<Context> = new Set();
        allEmitted.forEach((emitted) => {
          let c = getContextWithHistory(emitted, context);
          contexts.add(c);
        });

        // evaluate the input to determine whether there are any loops between the incoming context
        // and the input argument
        let hero = false;
        let proceed = true;
        let useShallow = false;
        let _input: Generated | undefined;
        if (input) {
          let _context = context;

          _input = _context.gen(input);

          __input = _input;
          let histories = _input.histories.filter((x) => allEmitted.has(x));

          if (!_input.codeFragments[0]) {
            proceed = false;
          } else if (histories.length > 0) {
            contexts = new Set();
            for (let h of histories) {
              contexts.add(getContextWithHistory(h, _context));
            }
            proceed = true;
            hero = true;
          } else {
            proceed = false;
            if (!_input.codeFragments[0].context.isSIMD) {
              cachedContext = _input.codeFragments[0].context;
              if (FORCENEW || allEmitted.size === 0) {
                __input = undefined;
              }
              return cachedContext;
            }
            proceed = true;

            // experimentally found by process of elimination:
            // TODO: explain why this works
            let deep = deepestContext(Array.from(contexts));
            if (deep && deep.context !== deep.baseContext && parent.isSIMD) {
              proceed = false;
            }
          }
        } else {
          proceed = true;

          // experimentally found by process of elimination:
          // jesus christ this is hellish
          let deep = deepestContext(Array.from(contexts));
          if (
            deep &&
            deep.context !== deep.baseContext &&
            (context.isSIMD || parent.isSIMD) &&
            context !== deep
          ) {
            if ((!FORCENEW && parent.isSIMD) || (!FORCENEW && context.isSIMD)) {
              if (parent.isSIMD) {
                if (contexts.size > 2) {
                  useShallow = true;
                  proceed = true;
                } else {
                  if (context.isSIMD) {
                    proceed = true;
                  } else {
                    proceed = true;
                    return context.useContext(false);
                  }
                }
              } else {
                proceed = false;
              }
            }
          } else {
          }
        }

        if (contexts.size > 0 && proceed) {
          let deepest = useShallow
            ? shallowestContext(Array.from(contexts))
            : deepestContext(Array.from(contexts));
          if (deepest) {
            cachedContext = deepest;
            return cachedContext;
          }
        }
      }

      if (FORCENEW && !context.newBase && parent && !parent.isSIMD && !parent.newBase) {
        cachedContext = parent;
        return cachedContext;
      }

      cachedContext = context.useContext(false);
      return cachedContext;
    };

    const allocateBlock = (context: Context): MemoryBlock => {
      let block = params ? context.baseContext.alloc(1) : context.alloc(1);
      contextBlocks = contextBlocks.filter((x) => !x.context.disposed);
      contextBlocks.push({ context: context.baseContext, block });
      return block;
    };

    const getMemoizedValueIfAny = (_context: Context): Generated | undefined => {
      if (input) {
        if (inMem) {
          return inMem;
        }
      } else {
        if (outMem) {
          return outMem;
        }
      }
      return undefined;
    };

    let _h: UGen & Clearer = (context: Context): Generated => {
      let memoizedResult = getMemoizedValueIfAny(context);
      if (memoizedResult) {
        return memoizedResult;
      }

      context = determineContext(context);

      if (!block) {
        block = allocateBlock(context);
      }

      if (params?.name) {
        block.name = params.name;
        block.min = params.min;
        block.max = params.max;
      }

      if (!historyVar) {
        historyVar = context.useCachedVariables(outputId, debugName || "historyVal")[0];
      }

      let IDX = block.idx;

      // reading from history (accessing memory)
      let historyDef =
        `${context.varKeyword} ${historyVar} = memory[${IDX}];` +
        (params ? `/* param ${params.name || ""}*/` : "") +
        "\n";

      if (input && historyVar) {
        // we are writing to this history from this context
        context.historiesEmitted.add(historyVar);
      }

      let _input = input !== undefined ? __input || context.gen(input) : undefined;
      let _reset = reset === undefined ? context.gen(float(0)) : context.gen(reset);

      // TODO: inspect the results of the _input (context), and potentially
      // grab the context and lift it to be used here

      if (_input && _input.context) {
        if (_input.context !== context) {
          //console.log("inspecting input context completedCycles/emitted", getAllCompleted(_input.context), getAllEmitted(_input.context));
          if (_input.context.isSIMD) {
            /*
                        if (_input.context.context) {
                            context = _input.context.context;
                        } else {
                            context = _input.context.useContext(false, true);
                        }
                        cachedContext = context;
                        */
          } else {
            context = _input.context;
            cachedContext = context;
          }

          if (outMem) {
            outMem.codeFragments.forEach((frag) => (frag.context = context));
          }
        }
      }

      let fragmentVariable: string = historyVar || "";
      let codeFragments: CodeFragment[] = [];

      if (_input) {
        codeFragments = generateInputFragment(context, IDX, historyDef, _input, _reset);
        fragmentVariable = codeFragments[0].variable;
      } else {
        // no "input" to history (aka reading the history value)
        codeFragments.push({
          context,
          code: "",
          variable: historyVar as string,
          histories: [historyDef],
          dependencies: [],
        });
      }

      initializeBlockWithData(block);

      let out: Generated = emit(
        context,
        _input,
        _reset,
        codeFragments,
        historyVar!,
        historyDef,
        fragmentVariable,
      );

      // memoize the results
      if (input !== undefined) {
        inMem = out;
      } else {
        outMem = out;
      }
      return out;
    };

    const initializeBlockWithData = (block: MemoryBlock) => {
      if (val !== undefined) {
        block.initData = new Float32Array([val]);
      }
      if (cachedValue !== undefined) {
        block.initData = new Float32Array([cachedValue]);
      }
    };

    const generateInputFragment = (
      context: Context,
      IDX: string | number,
      historyDef: string,
      _input: Generated,
      _reset: Generated,
    ): CodeFragment[] => {
      // we are writing to the history, placing the input into the memory at
      // the block index
      let [newVariable] = context.useCachedVariables(inputId, debugName || "histVal");
      let code = `
memory[${IDX}] = ${_input.variable};
`;
      // the following needs to be revisited:
      if (!params || !params.inline) {
        code += `${context.varKeyword} ${newVariable} = ${historyVar};
`;
      }
      if (params && params.inline) {
        newVariable = code;
        code = "";
      }

      let codeFragments = emitCodeHelper(false, context, code, newVariable, _input, _reset);
      codeFragments.forEach((frag) => (frag.histories = [historyDef]));
      return codeFragments;
    };

    const emit = (
      context: Context,
      _input: Generated | undefined,
      _reset: Generated,
      codeFragments: CodeFragment[],
      historyVar: string,
      historyDef: string,
      fragmentVariable: string,
    ): Generated => {
      let outputHistories = _input ? emitOutputHistory(_input, _reset) : [];
      let histories = _input ? emitHistory(_input, _reset) : [];
      let outerHistories = _input ? emitOuterHistory(_input, _reset) : [];
      let functions = _input ? emitFunctions(_input, _reset) : [];
      let args = _input ? emitArguments(_input, _reset) : [];

      let _params = _input ? emitParams(_input) : [];
      if (params && params.name) {
        _params = [_history, ..._params];
      }

      if (!historyDef.includes("*")) {
        outerHistories = [historyDef, ...outerHistories];
      }

      // go thru all code frags and add them to the history list
      for (let codeFrag of codeFragments) {
        codeFrag.context = context;
        let h = Array.from(new Set([historyVar as string, ...outputHistories]));
        for (let h1 of h) {
          if (!codeFrag.histories.includes(h1)) {
            codeFrag.histories.push(h1);
          }
        }
      }

      const x = {
        variable: fragmentVariable,
        codeFragments,
        histories: Array.from(new Set([historyDef, ...histories])),
        outputHistories:
          input === undefined
            ? Array.from(new Set([historyVar as string, ...outputHistories]))
            : outputHistories,
        outerHistories,
        params: _params,
        context: context,
        functions,
        variables: [fragmentVariable],
        functionArguments: args,
      };
      return x;
    };

    _h.clear = () => {};
    return _h;
  };

  if (params) {
    _history.paramName = params.name!;
  }

  /**
        allows to set history directly, via message passing
        when time is given, we schedule that
     */

  _history.getInitData = () => {
    if (block && block.initData && block.initData[0] !== undefined) {
      return block.initData[0];
    }
    return val || 0;
  };

  _history.value = (val: number, time?: Samples) => {
    if (Number.isNaN(val)) {
      return;
    }
    if (block?.initData && block?.initData[0] !== undefined) {
      block.initData[0] = val;
    }
    for (let { context, block } of contextBlocks) {
      let messageType: ContextMessageType = time !== undefined ? "schedule-set" : "memory-set";

      let body = {
        idx: block.idx,
        value: val,
        time,
      };
      context.baseContext.postMessage({
        type: messageType,
        body,
      });
    }

    cachedValue = val;
  };

  _history.getIdx = () => {
    if (block?.initData) {
      return block.idx as number;
    }
    return undefined;
  };

  return _history;
};

/** used to collect all the histories for a functions arguments */
export const emitHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.histories))).filter((x) => x !== undefined);
};

export const emitOutputHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.outputHistories))).filter((x) => x !== undefined);
};

/** used to collect all the histories for a functions arguments */
export const emitOuterHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.outerHistories || [])));
};

/** used to collect all the histories for a functions arguments */
export const emitParams = (...gen: Generated[]): History[] => {
  return Array.from(new Set(gen.flatMap((x) => x.params)));
};

export const findDeepHistories = (gen: Generated): string[] => {
  const histories: string[] = [...gen.histories];
  for (const dep of gen.codeFragments[0].dependencies) {
    histories.push(...findDeepHistories(gen));
  }

  return histories;
};
