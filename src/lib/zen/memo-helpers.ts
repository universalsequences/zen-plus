import {
  deepestContext,
  getParentContexts,
  getAllContexts,
  mergeMemoized,
  PartialUGen,
  SIMDUGen,
} from "./memo";
import type { SIMDContext, Context } from "./context";
import type { Generated } from "./zen";
import { getContextWithHistory, getHistoriesBeingWrittenTo } from "./memo-simd";

interface MemoizationResult {
  context: Context;
  memoization: Generated | undefined;
  skipSIMD: boolean;
}

export const determineMemoization = (
  historiesBeingWrittenTo: Set<string>, // w.r.t the incoming context
  context: Context, // the incoming context
  memoized: Generated, // the memoized result from previous execution
  downstreamHistories: string[],
  lastHistoriesWritten: number,
): MemoizationResult => {
  if (!memoized.context) {
    return {
      context,
      memoization: undefined,
      skipSIMD: false,
    };
  }
  if (context.forceScalar) {
    //context.target === Target.Javascript && memoized) {
    return {
      context,
      skipSIMD: true,
      memoization: memoized,
    };
  }
  if (
    context === memoized.context &&
    lastHistoriesWritten !== undefined &&
    historiesBeingWrittenTo.size > lastHistoriesWritten
  ) {
    // somewhere upstream a new history has been emitted, since the last memoization
    // therefore, we want to propagate this same memoized.context downwards, because
    // new histories have been emitted (i.e. written to)
    // really nothing to do in this case, we just proceed to remaining place
    /*
        if (historiesBeingWrittenTo.size - lastHistoriesWritten <= 1) {
            return {
                context: context,
                memoization: memoized,
                skipSIMD: false
            }
        }
        */
    count(1);
    return {
      context: context, // note: it's equal to memoized.context
      memoization: undefined,
      skipSIMD: false,
    };
  }
  if (context !== memoized.context) {
    // let historiesBeingWrittenToB = getHistoriesBeingWrittenTo(context);
    const matchingDownstreamHistoriesA = downstreamHistories.filter((h) =>
      historiesBeingWrittenTo.has(h),
    );
    const matchingDownstreamHistories = matchingDownstreamHistoriesA.length > 0;

    const caseA = !getParentContexts(context).has(memoized.context) && matchingDownstreamHistories;

    if (caseA) {
      // there are "some" downstream histories being written to "context",
      // thus we need to copy them over to the currently memoized context
      // this essentially means we are merging the incoming context into the "memoized" context
      // keep track of original context (we'll need to map it's parent to the memoized context's history root [context])
      let ogContext = context;

      // determine the root history context (starting from the memoized.context)
      context = memoized.context!;
      while ((context as SIMDContext).context && context.historiesEmitted.size == 0) {
        let parent = (context as SIMDContext).context;
        // TODO: for "LoopContext" we gotta clear this out and also avoid newBase
        context = (context as SIMDContext).context;
      }

      // copy over the histories from incoming context into the memoized.context's root history
      historiesBeingWrittenTo.forEach((h) => {
        context?.historiesEmitted.add(h);

        let contextToClear = getContextWithHistory(h, ogContext);
        if (contextToClear && contextToClear !== context) {
          contextToClear.historiesEmitted.delete(h);
        }
      });

      // now lets ensure the original incoming "context" points to the memoized.context's history context
      // as it's parent, to maintain the needed hierarchy of the tree of context's and their children
      // this hierarchy is how we can determine if a circular dependency loop is occuring (and thus avoid it)
      if (ogContext !== context) {
        if (!getParentContexts(context).has(ogContext)) {
          // we set its parent context to be the context we decided to use
          ogContext.context = context;
        }
      }

      count(2);
      return {
        memoization: undefined,
        context: context,
        skipSIMD: false,
      };
    }

    if (!getParentContexts(context).has(memoized.context)) {
      return {
        memoization: memoized,
        context: memoized.context,
        skipSIMD: false,
      };
    }
    // a series of hellish if statements (found experimentally) that try to memoize w/o breaking
    // "correctness"
    if (
      memoized.incomingContext === memoized.context &&
      memoized.context.context === memoized.context.baseContext
    ) {
      count(3);
      return {
        memoization: memoized,
        context: memoized.context,
        skipSIMD: false,
      };
    }

    if (memoized.incomingContext === context) {
      if (lastHistoriesWritten === historiesBeingWrittenTo.size || !matchingDownstreamHistories) {
        count(4);
        return {
          memoization: memoized,
          context: memoized.context,
          skipSIMD: false,
        };
      }
    }

    if (historiesBeingWrittenTo.size === lastHistoriesWritten) {
      if (memoized.context.context === memoized.context.baseContext) {
        count(6);
        return {
          memoization: memoized,
          context: memoized.context,
          skipSIMD: false,
        };
      }
    }

    if (historiesBeingWrittenTo.size === 0) {
      count(7);
      return {
        memoization: memoized,
        context: memoized.context,
        skipSIMD: false,
      };
    }

    if (memoized.context.isSIMD) {
      count(8);
      return {
        memoization: memoized,
        context: memoized.context,
        skipSIMD: false,
      };
    }

    // extreme ugly hack to avoid circular dependency loop and speed up
    if (
      (memoized.context.id === 1 || (memoized.incomingContext === context && context.isSIMD)) &&
      historiesBeingWrittenTo.size - lastHistoriesWritten <=
        (memoized.context.id === 1
          ? matchingDownstreamHistories && (memoized.incomingContext === context || context.isSIMD)
            ? 4
            : 1
          : 1)
    ) {
      console.log("RETURNING BUT MIGHT NOT NEED!");
      return {
        context: memoized.context,
        memoization: memoized,
        skipSIMD: false,
      };
    }
    count(11);
    // let matchingDownstreamHistoriesB = downstreamHistories.some(h => getHistoriesBeingWrittenTo(context).has(h));
    // console.log("id=%s PASS THRU CASE last=%s current=%s matchingA=%s matchingB=%s", memoized.codeFragments[0].id, lastHistoriesWritten, historiesBeingWrittenTo.size, matchingDownstreamHistories, matchingDownstreamHistoriesB, memoized.context, memoized.incomingContext, context, downstreamHistories, historiesBeingWrittenTo, memoized.codeFragments);
  } else if (context === memoized.context) {
    count(9);
    return {
      context: memoized.context,
      memoization: memoized,
      skipSIMD: false,
    };
  }

  count(10);
  return {
    context: context,
    memoization: undefined,
    skipSIMD: false,
  };
};

const count = (num: number) => {};

export const getDownstreamHistories = (...args: Generated[]): string[] => {
  let downstreamHistories: string[] = [];
  for (let evaluated of args) {
    for (let codeFragment of evaluated.codeFragments) {
      let _histories: string[] = [];
      codeFragment.histories.forEach((h) => {
        if (!downstreamHistories.includes(h)) {
          downstreamHistories.push(h);
        }
        if (!_histories.includes(h)) {
          _histories.push(h);
        }
      });
    }
  }

  return downstreamHistories;
};
