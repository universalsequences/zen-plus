import { MemoryBlock } from "./block";
import { getContextWithHistory } from "./memo-simd";
import { uuid } from "./uuid";
import { shallowestContext, deepestContext, getParentContexts } from "./memo";
import { CodeFragment } from "./emitter";
import { UGen, Generated, Arg, float } from "./zen";
import { Context, emitCodeHelper, ContextMessageType } from "./context";
import { emitFunctions, emitArguments } from "./functions";
import { SIMDContext } from "./index";

export type Samples = number;

interface HistoryParams {
  inline: boolean;
  name?: string;
  min?: number;
  max?: number;
  mc?: boolean;
}

/**
 * History function - creates a memory cell that can store a value over time
 *
 * Usage:
 * declare a history at start:
 * let history1 = history();
 *
 * now use it (ex: lowpass filter):
 * history1(mix(synth(), history1(), .999))
 */

// A function that also has fields to manipulate the history value at runtime
export type History = ((input?: UGen, reset?: UGen) => UGen) & {
  value?: (v: number, time?: number, invocation?: number) => void;
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

const getAllHistoriesEmitted = (context: Context): string[] => {
  return [
    ...Array.from(context.historiesEmitted),
    ...Array.from(getParentContexts(context)).flatMap((x) => Array.from(x.historiesEmitted)),
  ];
};

/**
 * Creates a history cell that can store a value over time
 * @param val Initial value (optional)
 * @param params Configuration parameters (optional)
 * @param debugName Name for debugging (optional)
 * @param FORCENEW Force creation of a new context (optional)
 */
export const history = (
  val?: number,
  params?: HistoryParams,
  debugName?: string,
  FORCENEW?: boolean,
): History => {
  // State for this history instance
  let block: MemoryBlock | undefined;
  let historyVar: string | undefined;
  let cachedValue: number | undefined;
  let inMem: Generated | undefined;
  let outMem: Generated | undefined;
  let contextBlocks: ContextualBlock[] = [];
  let cachedContext: Context | undefined;
  let inputId = uuid();
  let outputId = uuid();
  let cachedCompiledInput: Generated | undefined;

  // Main history function
  let _history: History = (input?: Arg, reset?: Arg): UGen & Clearer => {
    // Determine appropriate context based on input and existing history
    const determineContext = (context: Context): Context => {
      // Use cached context if available
      if (cachedContext) {
        return cachedContext;
      }

      // Handle scalar context
      if (context.forceScalar) {
        return context;
      }

      // Use provided context if params are specified
      if (params) {
        return context.useContext(false, true);
      }

      let allHistoriesEmitted = new Set(getAllHistoriesEmitted(context));
      let parent: Context | undefined = (context as SIMDContext).context;

      // Skip function caller contexts
      if (parent && (parent.isFunctionCaller || (FORCENEW && parent === parent.baseContext))) {
        parent = undefined;
      }

      // CRITICAL SECTION - Do not modify!
      // This section handles context selection for reverbs and other complex DSP
      // Note from author: I am sorry
      if (parent && allHistoriesEmitted.size > 0) {
        let contexts: Set<Context> = new Set();
        allHistoriesEmitted.forEach((emitted) => {
          let contextWithHistory = getContextWithHistory(emitted, context);
          contexts.add(contextWithHistory);
        });

        // Analyze input to determine context relationships
        let proceed = true;
        let useShallow = false;
        let compiledInput: Generated | undefined;

        if (input) {
          let _context = context;
          compiledInput = _context.gen(input);
          cachedCompiledInput = compiledInput;

          let histories = compiledInput.histories.filter((x) => allHistoriesEmitted.has(x));

          if (!compiledInput.codeFragments[0]) {
            proceed = false;
          } else if (histories.length > 0) {
            contexts = new Set();
            for (let h of histories) {
              contexts.add(getContextWithHistory(h, _context));
            }
            proceed = true;
          } else {
            proceed = false;
            if (!compiledInput.codeFragments[0].context.isSIMD) {
              cachedContext = compiledInput.codeFragments[0].context;
              if (FORCENEW || allHistoriesEmitted.size === 0) {
                cachedCompiledInput = undefined;
              }
              return cachedContext;
            }
            proceed = true;

            let deep = deepestContext(Array.from(contexts));
            if (deep && deep.context !== deep.baseContext && parent.isSIMD) {
              proceed = false;
            }
          }
        } else {
          proceed = true;

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
          }
        }
        // END CRITICAL SECTION

        // Select the appropriate context based on analysis
        if (contexts.size > 0 && proceed) {
          let bestContext = useShallow
            ? shallowestContext(Array.from(contexts))
            : deepestContext(Array.from(contexts));
          if (bestContext) {
            cachedContext = bestContext;
            return cachedContext;
          }
        }
      }

      // Handle FORCENEW with parent context
      if (FORCENEW && !context.newBase && parent && !parent.isSIMD && !parent.newBase) {
        cachedContext = parent;
        return cachedContext;
      }

      // Default: use a new context
      cachedContext = context.useContext(false);
      return cachedContext;
    };

    // Allocate a memory block for this history
    const allocateBlock = (context: Context): MemoryBlock => {
      let block = params?.mc
        ? context.alloc(1)
        : params
          ? context.baseContext.alloc(1)
          : context.alloc(1);
      contextBlocks = contextBlocks.filter((x) => !x.context.disposed);
      contextBlocks.push({ context: context.baseContext, block });
      return block;
    };

    // Get memoized value if available
    const getMemoizedValueIfAny = (_context: Context): Generated | undefined => {
      // note: there are 2 types of invocations of history, one with an input and one w/o an input
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

    // Main generator function
    let _h: UGen & Clearer = (context: Context): Generated => {
      // Check for memoized result
      let memoizedResult = getMemoizedValueIfAny(context);
      if (memoizedResult) {
        return memoizedResult;
      }

      // Get appropriate context
      context = determineContext(context);

      // Initialize block if needed
      if (!block) {
        block = allocateBlock(context);
      }

      // Set block parameters if provided
      if (params?.name) {
        block.name = params.name;
        block.min = params.min;
        block.max = params.max;
      }

      // Create history variable if needed
      if (!historyVar) {
        historyVar = context.useCachedVariables(outputId, debugName || "historyVal")[0];
      }

      let IDX = block.idx;

      // Define how to read from history (accessing memory)
      let codeGen =
        `${context.varKeyword} ${historyVar} = memory[${IDX}];` +
        (params ? `/* param ${params.name || ""}*/` : "") +
        "\n";

      // Mark history as emitted if we're writing to it
      if (input && historyVar) {
        context.historiesEmitted.add(historyVar);
      }

      // Process input and reset arguments
      let _input = input !== undefined ? cachedCompiledInput || context.gen(input) : undefined;
      let _reset = reset === undefined ? context.gen(float(0)) : context.gen(reset);

      // Adjust context based on input context if needed
      if (_input && _input.context) {
        if (_input.context !== context) {
          if (_input.context.isSIMD) {
            // Keep current context for SIMD
          } else {
            context = _input.context;
            cachedContext = context;
          }

          // Update outMem context if it exists
          if (outMem) {
            outMem.codeFragments.forEach((frag) => (frag.context = context));
          }
        }
      }

      let fragmentVariable: string = historyVar || "";
      let codeFragments: CodeFragment[] = [];

      // Generate code fragments for input or reading
      if (_input) {
        codeFragments = generateInputFragment(context, IDX, codeGen, _input, _reset);
        fragmentVariable = codeFragments[0].variable;
      } else {
        // No input, just reading from history
        codeFragments.push({
          context,
          code: "",
          variable: historyVar as string,
          histories: [codeGen],
          dependencies: [],
        });
      }

      // Initialize block with data
      initializeBlockWithData(block);

      // Emit the final Generated object
      let out: Generated = emit(
        context,
        _input,
        _reset,
        codeFragments,
        historyVar!,
        codeGen,
        fragmentVariable,
      );

      // Memoize the results
      if (input !== undefined) {
        inMem = out;
      } else {
        outMem = out;
      }
      return out;
    };

    // Set initial data for the memory block
    const initializeBlockWithData = (block: MemoryBlock) => {
      if (val !== undefined) {
        block.initData = new Float32Array(
          params?.mc ? new Array((block.context as any).loopSize).fill(val) : [val],
        );
      }
      if (cachedValue !== undefined) {
        if (params?.mc) {
          console.log("block=", block, params);
        }
        block.initData = new Float32Array(
          params?.mc ? new Array((block.context as any).loopSize).fill(cachedValue) : [cachedValue],
        );
      }
    };

    // Generate code fragment for writing to history
    const generateInputFragment = (
      context: Context,
      IDX: string | number,
      historyDef: string,
      _input: Generated,
      _reset: Generated,
    ): CodeFragment[] => {
      // Create variable for writing to history
      let [newVariable] = context.useCachedVariables(inputId, debugName || "histVal");

      // Write input to memory at the block index
      let code = `
memory[${IDX}] = ${_input.variable};
`;
      // Handle inline parameter
      if (!params || !params.inline) {
        code += `${context.varKeyword} ${newVariable} = ${historyVar};
`;
      }
      if (params && params.inline) {
        newVariable = code;
        code = "";
      }

      // Create code fragments
      let codeFragments = emitCodeHelper(false, context, code, newVariable, _input, _reset);
      codeFragments.forEach((frag) => (frag.histories = [historyDef]));
      return codeFragments;
    };

    // Create the Generated object with all necessary properties
    const emit = (
      context: Context,
      _input: Generated | undefined,
      _reset: Generated,
      codeFragments: CodeFragment[],
      historyVar: string,
      historyDef: string,
      fragmentVariable: string,
    ): Generated => {
      // Collect histories, functions, and arguments
      let outputHistories = _input ? emitOutputHistory(_input, _reset) : [];
      let histories = _input ? emitHistory(_input, _reset) : [];
      let outerHistories = _input ? emitOuterHistory(_input, _reset) : [];
      let functions = _input ? emitFunctions(_input, _reset) : [];
      let args = _input ? emitArguments(_input, _reset) : [];

      let _params = _input ? emitParams(_input) : [];
      if (params && params.name) {
        _params = [_history, ..._params];
      }

      // Add history definition to outer histories if needed
      if (!historyDef.includes("*")) {
        outerHistories = [historyDef, ...outerHistories];
      }

      // Add history to all code fragments
      for (let codeFrag of codeFragments) {
        codeFrag.context = context;
        let h = Array.from(new Set([historyVar as string, ...outputHistories]));
        for (let h1 of h) {
          if (!codeFrag.histories.includes(h1)) {
            codeFrag.histories.push(h1);
          }
        }
      }

      // Create and return the Generated object
      return {
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
    };

    _h.clear = () => {};
    return _h;
  };

  // Set parameter name if provided
  if (params) {
    _history.paramName = params.name!;
  }

  // Get initial data value
  _history.getInitData = () => {
    if (block && block.initData && block.initData[0] !== undefined) {
      return block.initData[0];
    }
    return val || 0;
  };

  // Set history value in realtime (can be scheduled for later)
  _history.value = (val: number, time?: Samples, invocation?: number) => {
    if (Number.isNaN(val)) {
      return;
    }
    // Update initData if available
    if (block?.initData && block?.initData[0] !== undefined) {
      block.initData[0] = val;
    }
    // Post message to all relevant contexts
    for (let { context, block } of contextBlocks) {
      let messageType: ContextMessageType = time !== undefined ? "schedule-set" : "memory-set";

      const idx = invocation !== undefined ? (block._idx as number) + invocation : block.idx;
      let body = {
        idx,
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

  // Get the memory index
  _history.getIdx = () => {
    if (block?.initData) {
      return block.idx as number;
    }
    return undefined;
  };

  return _history;
};

// Helper functions to collect histories and params from Generated objects

/** Collect all histories from generated objects */
export const emitHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.histories))).filter((x) => x !== undefined);
};

/** Collect all output histories from generated objects */
export const emitOutputHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.outputHistories))).filter((x) => x !== undefined);
};

/** Collect all outer histories from generated objects */
export const emitOuterHistory = (...gen: Generated[]): string[] => {
  return Array.from(new Set(gen.flatMap((x) => x.outerHistories || [])));
};

/** Collect all params from generated objects */
export const emitParams = (...gen: Generated[]): History[] => {
  return Array.from(new Set(gen.flatMap((x) => x.params)));
};

/** Recursively find all histories in a generated object */
export const findDeepHistories = (gen: Generated): string[] => {
  const histories: string[] = [...gen.histories];
  for (const dep of gen.codeFragments[0].dependencies) {
    histories.push(...findDeepHistories(gen));
  }

  return histories;
};
