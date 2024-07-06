import { UGen, Generated, Arg } from "./zen";
export { simdMemo } from "./memo-simd";
import { LoopContext, Context, SIMDContext } from "./context";
import { CodeFragment } from "./emitter";
import { uuid } from "./uuid";

/**
 * this ensures that functions that get called multiple times try to
 * only do the function's "work" once, and it's value gets re-used
 */

export const getParentContexts = (
  context: Context,
  skipCache = false,
): Set<Context> => {
  if (context.cachedParents && !skipCache) {
    return context.cachedParents;
  }

  let contexts: Set<Context> = new Set();

  while ((context as SIMDContext).context) {
    context = (context as SIMDContext).context;
    if (!context.isFunctionCaller) {
      contexts.add(context);
    }

    if (context.newBase || (context as LoopContext).loopSize) {
      break;
    }
  }

  context.cachedParents = contexts;
  return contexts;
};

export const deepestContext = (contexts: Context[]): Context | undefined => {
  let deepest: Context = contexts[0];
  let minDepth = Infinity;
  for (let c of contexts) {
    let depth = getDepth(c);
    if (depth < minDepth) {
      minDepth = depth;
      deepest = c;
    }
  }
  return deepest;
};

export const shallowestContext = (contexts: Context[]): Context | undefined => {
  let deepest: Context = contexts[0];
  let maxDepth = -Infinity;
  for (let c of contexts) {
    let depth = getDepth(c);
    if (depth > maxDepth) {
      maxDepth = depth;
      deepest = c;
    }
  }
  return deepest;
};

const getDepth = (context: Context): number => {
  if (context.depth !== undefined) {
    return context.depth;
  }
  let depth = 0;
  while ((context as SIMDContext).context) {
    context = (context as SIMDContext).context;
    depth++;
  }
  context.depth = depth;

  return depth;
};

export const getAllContexts = (codeFragment: CodeFragment): Context[] => {
  if (codeFragment.contexts) {
    return codeFragment.contexts;
  }
  let contexts = new Set([codeFragment.context]);
  for (let dep of codeFragment.dependencies) {
    let all = getAllContexts(dep);
    for (let c of all) {
      if (!contexts.has(c)) {
        contexts.add(c);
      }
    }
  }
  codeFragment.contexts = Array.from(contexts);
  return codeFragment.contexts;
};

const clearIgnoreMemoization = (context: Context) => {
  context.ignoreMemoization = true;
  for (let c of context.childContexts) {
    clearIgnoreMemoization(c);
  }
};

export type Memoized = UGen & {
  clear?: (h?: string) => void;
};

export type SIMDOutput = {
  generated?: Generated;
  type: "SUCCESS" | "SIMD_NOT_SUPPORTED";
  historyDetected?: string;
};

export type PartialUGen = (context: Context, ...args: Generated[]) => Generated;
export type SIMDUGen = (
  context: SIMDContext,
  ...args: Generated[]
) => SIMDOutput;

/**
 *
 * To be used with memoized SIMD functions. Attemps to generated SIMD code
 * if available, and if a history cycle is detected while generating it will
 * fall back on scalar
 *
 * @param scalarGen
 * @param simdGen
 * @param args
 * @returns
 */

let MEMO_COUNTER = 0;

type ContextualArgs = {
  evaluatedArgs: Generated[];
  context: Context | null;
};

export const memo = (fn: UGen, isSIMD: boolean = false): Memoized => {
  let _memoized: Generated | undefined;
  let _context: Context | undefined;
  let clearCounts = 0;
  let contexts: Context[] = [];
  let id = uuid();
  let cleared = false;

  let x = (context: Context): Generated => {
    if (_memoized) {
      return _memoized;
    }
    let result = context.historyContext
      ? fn(context)
      : fn(context.useContext(false, false));

    // ideally, we'd be able to invoke clear on the arguments/dependencies within memoized
    // so when we create a code fragment, we need to include a way to clear?

    if (_memoized) {
      mergeMemoized(_memoized, result, context);
      _memoized = result;
      cleared = false;
    } else {
      _memoized = result;
    }
    console.log("MEMO old=", result.variable);
    //memoized.push(result);

    result.codeFragments[0].clearMemoization = () => {
      cleared = true;
    };

    result.clearMemoization = () => {
      cleared = true;
    };
    return _memoized;
  };

  (x as Memoized).clear = (x?: string) => {
    if (_memoized) {
      cleared = true;
    }
  };
  return x as Memoized;
};

export const mergeMemoized = (
  _memoized: Generated,
  result: Generated,
  context: Context,
): Generated => {
  let newContext = result.codeFragments[0].context;
  (_memoized as Generated).codeFragments[0].variable =
    result.codeFragments[0].variable;
  (_memoized as Generated).codeFragments[0].code = result.codeFragments[0].code;
  (_memoized as Generated).codeFragments[0].context = newContext;
  (_memoized as Generated).codeFragments[0].dependencies =
    result.codeFragments[0].dependencies;
  (_memoized as Generated).codeFragments[0].histories =
    result.codeFragments[0].histories;
  (_memoized as Generated).variable = result.variable;
  (_memoized as Generated).context = newContext;
  (_memoized as Generated).histories = result.histories;
  (_memoized as Generated).outputHistories = result.outputHistories;
  (_memoized as Generated).codeFragments[0].contexts = undefined;
  return _memoized;
};
