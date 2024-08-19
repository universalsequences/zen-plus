import { UGen, Generated, Arg } from "./zen";
import {
  deepestContext,
  getParentContexts,
  getAllContexts,
  mergeMemoized,
  PartialUGen,
  SIMDUGen,
} from "./memo";
import { LoopContext, Context, SIMDContext } from "./context";
import { CodeFragment } from "./emitter";
import { uuid } from "./uuid";
import { determineMemoization } from "./memo-helpers";
import { Target } from "./targets";

export const getHistoriesBeingWrittenTo = (context: Context) => {
  let histories: Set<string> = new Set(Array.from(context.historiesEmitted));

  while ((context as SIMDContext).context) {
    context = (context as SIMDContext).context;
    context.historiesEmitted.forEach((h) => histories.add(h));

    if ((context as LoopContext).loopSize) {
      break;
    }
  }
  return histories;
};

const getDeepestHistoryContext = (context: Context): Context | null => {
  let historyContext: Context | null = null;

  if (context.historiesEmitted.size > 0) {
    historyContext = context;
  }
  while ((context as SIMDContext).context) {
    context = (context as SIMDContext).context;
    if (context.historiesEmitted.size > 0) {
      historyContext = context;
    }
  }
  return historyContext;
};

const getContextWritingToHistory = (
  context: Context,
  history: string,
): Context | null => {
  /*
    if (history.split(" ").length > 1) {
        history = history.split(" ")[1];
    }
    */
  return _getContextWritingToHistory(context, history);
};

const _getContextWritingToHistory = (
  context: Context,
  history: string,
): Context | null => {
  if (context.historiesEmitted.has(history)) {
    return context;
  }

  if ((context as LoopContext).loopSize) {
    return null;
  }
  let parentContext = (context as SIMDContext).context;
  if (parentContext) {
    return _getContextWritingToHistory(parentContext, history);
  }
  return null;
};

export const simdMemo = (
  scalarGen: PartialUGen,
  simdGen?: SIMDUGen,
  ...args: Arg[]
): UGen => {
  // when we evaluate the arguments we store the histories that are being used here
  // that way, when we-- possibly-- re-evaluate this function w/ a different context, that
  // happens to match one of the downstream histories, we can know to properly re-evaluate
  let downstreamHistories: Set<string>;
  let memoized: Generated;
  const id = uuid();

  let evaluations = 0;

  type ContextualArgs = {
    evaluatedArgs: Generated[];
    downstreamHistories: Set<string>;
    context: Context;
  };

  /**
   * evaluates the arguments for this operation using a context, checking any
   * "read" histories from these arguments, against
   * the histories being currently written to.
   * When recursive dependencies (i.e. a history loop) is detected, we
   */

  const evaluateArgs = (
    context: Context,
    historiesBeingWrittenTo: Set<string>,
  ): ContextualArgs => {
    let contextToUse: Context = context;
    let evaluatedArgs: Generated[] = [];
    let downstreamHistories: Set<string> = new Set();
    let potentialConversion: Context[] = [];
    let potentialIndices: number[] = [];
    let historyContext: Context | undefined;
    let i = 0;
    for (const arg of args) {
      let evaluated = context.gen(arg);
      if (context.forceScalar) {
        evaluatedArgs[i] = evaluated;
        i++;
        continue;
      }
      for (let codeFragment of evaluated.codeFragments) {
        const _histories: Set<string> = new Set();
        codeFragment.histories.forEach((h) => {
          downstreamHistories.add(h);
          _histories.add(h);
        });

        const histories: Set<string> = new Set();
        _histories.forEach((h) => {
          if (historiesBeingWrittenTo.has(h)) {
            histories.add(h);
          }
        });

        if (
          codeFragment.context !== contextToUse &&
          codeFragment.context.historiesEmitted.size > 0 &&
          Array.from(codeFragment.context.historiesEmitted).every((x) =>
            historiesBeingWrittenTo.has(x),
          )
        ) {
          // in this case, we are potentially "lifting" the context from one the arguments
          // to be used as the context here.
          // this is because we noticed that the histories emitted from the arg's context matches
          // some of the histories being currently written to the incoming context
          // Question: would it be better to first check if this arg's context is a descendent
          // of the incoming context (in which case it might be refereing to the same root history
          // and we don't want to do this)

          // NOTE: the point of this, is to propagate UP the tree when a context changes (due to
          // histories being written in a sub-tree)
          potentialConversion.push(codeFragment.context);
          potentialIndices.push(i);
        }
        if (histories.size > 0) {
          const contexts: Context[] = [];
          histories.forEach((history) => {
            let c = getContextWritingToHistory(contextToUse, history);
            if (c) {
              contexts.push(c);
            }
          });

          const _context = deepestContext(contexts) || contextToUse;

          if (_context && _context !== contextToUse) {
            contextToUse = _context;
            historyContext = contextToUse;
            evaluated = contextToUse.gen(arg);
          }
        }
      }
      evaluatedArgs.push(evaluated);
      i++;
    }

    if (potentialConversion.length > 0 && !historyContext) {
      let j = 0;
      let pot = deepestContext(potentialConversion) || potentialConversion[0];
      for (let arg of args) {
        if (potentialIndices.includes(j)) {
          evaluatedArgs[j] = (historyContext || pot).gen(arg);
        }
        j++;
      }
      contextToUse = historyContext || pot;
    }

    // check for cycles
    i = 0;
    if (context.target === Target.C) {
      for (let arg of evaluatedArgs) {
        // go one further
        if (
          arg.codeFragments[0] &&
          arg.codeFragments[0].context !== contextToUse
        ) {
          let allContexts = arg.codeFragments[0].dependencies.flatMap(
            (x) => x.context,
          );
          let parents = getParentContexts(contextToUse);
          if (allContexts.some((x) => parents.has(x))) {
            contextToUse = allContexts.find((x) => parents.has(x)) as Context;
            evaluatedArgs[i] = contextToUse.gen(args[i]);
          }
        }
        i++;
      }
    }

    const result = {
      downstreamHistories,
      context: contextToUse,
      evaluatedArgs,
    };
    return result;
  };

  const emit = (context: Context, result: Generated): Generated => {
    //result.codeFragments[0].code += ` /* id: ${id} */ `;
    result.codeFragments[0].id = id;

    if (memoized) {
      // this memoized object might be used elsewhere, so we need to mutate
      // the memoized object with the "new" results, so that any other fragments
      // referencing it may receive the updated values
      mergeMemoized(memoized, result, context);
      memoized.context = context;
      memoized.codeFragments[0].context = context;
      return memoized;
    }
    memoized = result;

    return result;
  };

  let _simdContext: SIMDContext;

  let lastHistoriesWritten: number | undefined = undefined;

  return (context: Context): Generated => {
    let skipSIMD = false;

    // we first calculate what  histories have been written to this incoming context
    const historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context);

    if (memoized?.context && lastHistoriesWritten !== undefined) {
      // in order to avoid re-calculating this sub-tree, we check against the saved
      // memoization of this operation, along with the incoming context
      const a = new Date().getTime();
      const memoizationResult = determineMemoization(
        historiesBeingWrittenTo,
        context,
        memoized,
        Array.from(downstreamHistories),
        lastHistoriesWritten,
      );

      const b = new Date().getTime();
      if (window.determineTime === undefined) {
        window.determineTime = 0;
      }
      window.determineTime += b - a;
      if (memoizationResult.memoization) {
        // no need to re-calculate
        return memoizationResult.memoization;
      }
      context = memoizationResult.context;
      skipSIMD = memoizationResult.skipSIMD;
    }

    // record the # of histories being written to-- at this point of execution
    lastHistoriesWritten = historiesBeingWrittenTo.size;

    if (simdGen && !skipSIMD && !context.forceScalar) {
      let simdContext: SIMDContext =
        _simdContext || (context.useContext(true) as SIMDContext);
      _simdContext = simdContext;
      let result = evaluateArgs(simdContext, historiesBeingWrittenTo);
      downstreamHistories = result.downstreamHistories;

      if (result.context !== simdContext) {
        // this means we detected a history thats being written to in the args
        // and we must fall back on the scalar-version of this operation-- AND
        // use that history's context
        const _context = result.context.isSIMD
          ? result.context.useContext(false)
          : result.context;
        return emit(_context, scalarGen(_context, ...result.evaluatedArgs));
      } else {
        // no circular histories detected.
        // this means we can simply try out the SIMD version
        let simdResult = simdGen(simdContext, ...result.evaluatedArgs);

        if (simdResult.type === "SUCCESS" && simdResult.generated) {
          return emit(result.context, simdResult.generated);
        } else {
          // SIMD operation "failed" -- usually meaning, for a given operation, there
          // was no SIMD version or it was all scalar constants (and thus calculated directly)
          // so, we fall back on scalar below
        }
      }
    }

    // scalar path:
    context = context.useContext(false);
    let result = evaluateArgs(context, historiesBeingWrittenTo);

    downstreamHistories = result.downstreamHistories;

    if (result.context.isSIMD) {
      if (
        result.context.context &&
        !result.context.context.isFunctionCaller &&
        !result.context.forceScalar
      ) {
        // is this really what we want? what does this imply if the resulting context
        // is SIMD but we wish to make this operation scalar
        // potentially, evaluateArgs lifted a context from below
        result.context = result.context.context;
      } else {
        result.context = result.context.useContext(false);
      }
    }

    if (context.forceScalar) {
      result.context = context;
    }

    return emit(
      result.context,
      scalarGen(result.context, ...result.evaluatedArgs),
    );
  };
};

export const getContextWithHistory = (
  history: string,
  context: Context,
): Context => {
  if (context.historiesEmitted.has(history)) {
    return context;
  }

  while ((context as SIMDContext).context) {
    context = (context as SIMDContext).context;
    if (context.historiesEmitted.has(history)) {
      return context;
    }
  }
  return context;
};

const getContextsWithHistory = (
  history: string,
  context: Context,
): Context[] => {
  const contexts: Context[] = [];
  if (context.historiesEmitted.has(history)) {
    contexts.push(context);
  }

  while ((context as SIMDContext).context) {
    if ((context as LoopContext).loopSize) {
      break;
    }
    context = (context as SIMDContext).context;
    if (context.historiesEmitted.has(history)) {
      contexts.push(context);
    }
  }
  return contexts;
};
