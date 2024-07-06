import { UGen, Generated, Arg } from './zen';
import { deepestContext, getParentContexts, getAllContexts, mergeMemoized, PartialUGen, SIMDUGen } from './memo';
import { LoopContext, Context, SIMDContext } from './context';
import { CodeFragment } from './emitter';
import { uuid } from './uuid';

const getHistoriesBeingWrittenTo = (context: Context) => {
    let histories: Set<string> = new Set(Array.from(context.historiesEmitted));

    /*
    if (context.transformIntoContext) {
        histories.push(...getHistoriesBeingWrittenTo(context.transformIntoContext));
    }
    */

    while ((context as SIMDContext).context) {
        context = (context as SIMDContext).context;
        context.historiesEmitted.forEach(
            h =>
                histories.add(h));
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

const getContextWritingToHistory = (context: Context, history: string): Context | null => {
    if (history.split(" ").length > 1) {
        history = history.split(" ")[1];
    }
    return _getContextWritingToHistory(context, history);
}

const _getContextWritingToHistory = (context: Context, history: string): Context | null => {
    if (context.historiesEmitted.has(history)) {
        return context;
    }
    let parentContext = (context as SIMDContext).context;
    if (parentContext) {
        return _getContextWritingToHistory(parentContext, history);
    }
    return null;
};

export const simdMemo = (scalarGen: PartialUGen, simdGen?: SIMDUGen, ...args: Arg[]): UGen => {
    // when we evaluate the arguments we store the histories that are being used here
    // that way, when we-- possibly-- re-evaluate this function w/ a different context, that
    // happens to match one of the downstream histories, we can know to properly re-evaluate
    let downstreamHistories: string[];
    let memoized: Generated;
    let id = uuid();

    let evaluations = 0;


    type ContextualArgs = {
        evaluatedArgs: Generated[];
        downstreamHistories: string[];
        context: Context;
    }

    /**
     * evaluates the arguments for this operation using a context, checking any
     * "read" histories from these arguments, against
     * the histories being currently written to.
     * When recursive dependencies (i.e. a history loop) is detected, we 
     */
    const evaluateArgs = (context: Context, historiesBeingWrittenTo: Set<string>, skipConversion: boolean): ContextualArgs => {
        //        console.log('evaluateArgs(context=%s) id=%s', context.id, id);
        let contextToUse: Context = context;
        let evaluatedArgs: Generated[] = [];
        let downstreamHistories: string[] = [];
        let potentialConversion: Context[] = [];
        let historyContext: Context | undefined;
        let i = 0;
        for (let arg of args) {
            //let evaluated = contextToUse.gen(arg);
            let evaluated = context.gen(arg);
            // historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context); //.forEach(
            for (let codeFragment of evaluated.codeFragments) {
                let _histories: string[] = [];
                codeFragment.histories.forEach(
                    h => {
                        if (!downstreamHistories.includes(h)) {
                            downstreamHistories.push(h);
                        }
                        if (!_histories.includes(h)) {
                            _histories.push(h);
                        }
                    });

                let histories = _histories.filter(
                    h => Array.from(historiesBeingWrittenTo).some(hh => h.includes(hh) || hh.includes(h)));
                //let history = histories[0];

                // detect all the contexts inside this branch.
                // are any of these contexts from an upstream dependency
                // let all = getAllContexts(codeFragment);

                if (codeFragment.context !== contextToUse && codeFragment.context.historiesEmitted.size > 0 && Array.from(codeFragment.context.historiesEmitted).every(
                    x => historiesBeingWrittenTo.has(x))) {

                    //                    console.log("adding to potential conversion id=%s variable=%s context.id=%s", id, codeFragment.variable, codeFragment.context.id);
                    potentialConversion.push(codeFragment.context);
                    // contextToUse = codeFragment.context;
                    //                    console.log("id=%s CONTEXT CONVERSION HAPPENED !!!! =", id, contextToUse, histories);
                    //                    ////console.log("og context of op id=%s", id, context);
                    // evaluatedArgs[i] = evaluated;
                }

                if (histories.length > 0) {
                    //                    //                    console.log("HISTORIES.length > 0 id=%s", id);
                    let contexts: Context[] = [];
                    for (let history of histories) {
                        let c = getContextWritingToHistory(contextToUse, history);
                        if (c) {
                            contexts.push(c);
                        }
                    }

                    //
                    let _context = deepestContext(contexts) || contextToUse;

                    if (_context && _context !== contextToUse) {
                        contextToUse = _context;
                        // re-evaluate with this context
                        //                        console.log("HISTORY CASE! id=%s eval arg", id, _context, contexts, histories, context, historiesBeingWrittenTo);
                        historyContext = contextToUse;
                        evaluated = contextToUse.gen(arg);
                    }

                }

            }
            evaluatedArgs.push(evaluated);
            i++;
        }

        if (potentialConversion.length > 0) {
            let j = 0;
            let pot = deepestContext(potentialConversion) || potentialConversion[0];
            let candidates: Context[] = [];
            //for (let _pot of potentialConversion) {
            for (let h of downstreamHistories) {
                if (pot.historiesEmitted.has(h)) {
                    let contexts = getContextsWithHistory(h, pot);
                    let deep = deepestContext(contexts);
                    if (deep) {
                        candidates.push(deep);
                    }
                }
            }
            //}
            if (candidates.length > 0) {
                // pot = deepestContext(candidates) || candidates[0];
            }

            let historyCandidates: Set<Context> = new Set();
            if (historyContext) {
                for (let h of downstreamHistories) {
                    if (historyContext.historiesEmitted.has(h)) {
                        let contexts = getContextsWithHistory(h, historyContext);
                        let deep = deepestContext(contexts);
                        if (deep) {
                            historyCandidates.add(deep);
                        }
                    }
                }
                if (historyCandidates.size > 1) {
                    //                    console.log("history candidates=", historyCandidates);
                }
                //                console.log("HISTORY CONTEXT=", historyContext);
            }
            //            console.log("deepest candidates id=%s", id, candidates, context, potentialConversion);
            for (let arg of args) {
                evaluatedArgs[j] = (historyContext || pot).gen(arg);
                j++;
            }
            contextToUse = historyContext || pot;
            //            //            console.log("POTENTIAL CONVERSION TRIGGERED = ", potentialConversion);
        }

        if (historyContext) {
            //            //            console.log("THERE WAS A HISTORY CONTEXT!", historyContext, potentialConversion);
        }
        //        //console.log('eval args id=%s contextToUse / potentialConversion/ historyContext', id, contextToUse, potentialConversion, historyContext, downstreamHistories);

        let result = {
            downstreamHistories,
            context: contextToUse,
            evaluatedArgs
        };
        //        console.log("eval args id=%s contextFound=", id, contextToUse.id);

        if (contextToUse.isFunctionCaller) {
            //console.log("eval args function caller used id=%s", id);
        }
        return result;
    };

    const emit = (context: Context, result: Generated): Generated => {
        result.codeFragments[0].code += ` /* id: ${id} */ `;
        result.codeFragments[0].id = id;

        let historiesWritten = getHistoriesBeingWrittenTo(context);
        for (let h of downstreamHistories) {
            if (historiesWritten.has(h)) {
                let co = getContextWithHistory(h, context);
                co.completedCycles.add(h);
            }
        }

        if (memoized) {
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
        let ogContext = context;
        let skipSIMD = false;

        evaluations++;
        //console.log("memo id=%s context.id=%s", id, context.id, getParentContexts(context).map(x => x.id).join("+"), context, memoized);

        let historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context);
        let skipConversion = false;
        if (memoized && memoized.context) {
            if (context === memoized.context && lastHistoriesWritten !== undefined &&
                historiesBeingWrittenTo.size > lastHistoriesWritten) {
                //                //                console.log("case A id=%s", id);
                // we want to propagate this same memoized.context down, because
                // new histories have been emitted (i.e. written to)
                // really nothing to do in this case, we just proceed to remaining place
            } else if (context !== memoized.context) {
                let historiesBeingWrittenToB = getHistoriesBeingWrittenTo(context);
                if (historiesBeingWrittenTo.size > 0 && historiesBeingWrittenToB.size > 0 && downstreamHistories.length > 0 &&
                    downstreamHistories.some(h => historiesBeingWrittenToB.has(h))) {
                    // there are histories being written to "context", thus we need to copy them over
                    // to the memoized.context
                    //                    console.log("case B id=%s conversion memoized.context/context", id, memoized.context, context);

                    //                    console.log("in case histories being written to=", getHistoriesBeingWrittenTo(context), downstreamHistories);

                    // this essentially means we are merging context into memoized.context
                    let ogContext = context;

                    context = memoized.context;
                    while ((context as SIMDContext).context && context.historiesEmitted.size == 0) {
                        context = (context as SIMDContext).context;
                    }

                    //                    //                    console.log("case b conversion resulted in context/ogContext=", context, ogContext);
                    skipConversion = true;

                    historiesBeingWrittenTo.forEach(
                        h => {
                            //                            console.log('adding history=%s to context=%s id=%s', h, context.id, id);
                            context?.historiesEmitted.add(h);
                        });

                    // in order for the parent shit to work we need to make the og context have a parent to be the memoized.context

                    // skipSIMD = true;

                    if (ogContext === context) {
                    } else {
                        if (!getParentContexts(context).includes(ogContext)) {
                            //                            console.log('id=%s, setting og context.context = context', id, ogContext, getParentContexts(ogContext).map(x => x.id).join("+"), context);
                            ogContext.context = context;
                        }
                    }

                    //                    console.log("copying over to memoized.context / context", memoized.context, context);

                    historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context);
                } else if (!getParentContexts(context).includes(memoized.context)) {
                    // otherwise we return memoized
                    //                    //                    console.log("case C id=%s", id);
                    //                    console.log('returning memoized A');
                    return memoized;
                } else {
                    // THIS IS LAXING TOWARDS THE SCALAR SIDE OF THINGS
                    if (memoized.context.isSIMD) {
                        skipSIMD = true;
                    }
                }
            } else if (context === memoized.context) {
                //                console.log('returning memoized B');
                return memoized;
            }
        } else {
            //            //            console.log("no memo id=%s", id);
        }

        //console.log('after memoization shit id=%s', id, context.id);

        lastHistoriesWritten = historiesBeingWrittenTo.size;


        if (memoized && memoized.context) {
            getHistoriesBeingWrittenTo(memoized.context).forEach(
                h => historiesBeingWrittenTo.add(h));
            //historiesBeingWrittenTo.push(...getHistoriesBeingWrittenTo(memoized.context));
        }

        //        console.log("attempting id=%s with context=", id, context);
        if (simdGen && !skipSIMD) {
            let simdContext: SIMDContext = _simdContext || context.useContext(true) as SIMDContext;
            _simdContext = simdContext;
            let result = evaluateArgs(simdContext, historiesBeingWrittenTo, skipConversion);
            //console.log("SIMD case evalArgs id=%s", id, result, ogContext);
            downstreamHistories = result.downstreamHistories;


            if (result.context !== simdContext) {

                // this means we detected a history thats being written to in the args
                // and we must fall back on the scalar-version of this operation-- AND
                // use that history's context
                let _context = result.context; //result.context.isSIMD ? result.context.useContext(false) : result.context;

                return emit(
                    _context,
                    scalarGen(_context, ...result.evaluatedArgs));
            } else {
                // no circular histories detected: means we can simply try out the SIMD version
                let simdResult = simdGen(
                    simdContext, ...result.evaluatedArgs);

                if (simdResult.type === "SUCCESS" && simdResult.generated) {
                    return emit(
                        result.context,
                        simdResult.generated);
                } else {
                    // otherwise, we fall back on scalar
                }
            }
        }

        // scalar path:
        context = context.useContext(false);
        let result = evaluateArgs(context, historiesBeingWrittenTo, skipConversion);
        //        //        console.log("evalArgs id=%s", id, result);

        downstreamHistories = result.downstreamHistories;

        if (result.context.isSIMD) {
            if (result.context.context && !result.context.context.isFunctionCaller) {
                // is this really what we want? what does this imply if the resulting context
                // is SIMD but we wish to make this operation scalar
                result.context = result.context.context;
            } else {
                result.context = result.context.useContext(false);
            }
        }

        if (result.context.isFunctionCaller) {
            //console.log("scalar function caller id=%s", id);
        }
        return emit(
            result.context,
            scalarGen(result.context, ...result.evaluatedArgs));
    };
}

export const getContextWithHistory = (history: string, context: Context): Context => {

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

const getContextsWithHistory = (history, context: Context): Context[] => {
    let contexts: Context[] = [];
    if (context.historiesEmitted.has(history)) {
        contexts.push(context);
    }

    while ((context as SIMDContext).context) {
        context = (context as SIMDContext).context;
        if (context.historiesEmitted.has(history)) {
            contexts.push(context);
        }
    }
    return contexts;
};
