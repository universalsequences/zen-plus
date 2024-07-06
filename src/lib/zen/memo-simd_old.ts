mport { UGen, Generated, Arg } from './zen';
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
        //console.log('evaluateArgs(context=%s) id=%s', context.id, id);
        let contextToUse: Context = context;
        let indices: number[] = [];
        let evaluatedArgs: Generated[] = [];
        let downstreamHistories: string[] = [];
        let potentialConversion: Context[] = [];
        let historyContexts: Context[] = [];
        let i = 0;
        for (let arg of args) {
            let evaluated = contextToUse.gen(arg);
            historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context); //.forEach(
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

                if (histories.length > 0) {
                    //                    console.log("HISTORIES.length > 0 id=%s", id);
                    let contexts: Context[] = [];
                    for (let history of histories) {
                        let c = getContextWritingToHistory(contextToUse, history);
                        if (c) {
                            contexts.push(c);
                        }
                    }

                    //
                    let _context = deepestContext(contexts);

                    if (_context && _context !== contextToUse) {
                        contextToUse = _context;
                        // re-evaluate with this context
                        //console.log("HISTORY CASE! id=%s eval arg", id, _context, contexts, histories, context);
                        if (contextToUse) {
                            historyContexts.push(contextToUse);
                        }
                        evaluated = contextToUse.gen(arg);
                        indices.push(i);
                    } else if (codeFragment.context.historiesEmitted.size > 0 && Array.from(codeFragment.context.historiesEmitted).every(
                        x => historiesBeingWrittenTo.has(x))) {

                        //console.log("adding to potential conversion id=%s variable=%s context.id=%s", id, codeFragment.variable, codeFragment.context.id, context, historiesBeingWrittenTo);
                        //potentialConversion.push(codeFragment.context);
                        contextToUse = codeFragment.context;
                        //console.log("id=%s CONTEXT CONVERSION HAPPENED !!!! =", id, contextToUse, histories);
                        ////console.log("og context of op id=%s", id, context);
                        evaluated = contextToUse.gen(arg);
                    }



                }

            }
            evaluatedArgs.push(evaluated);
            i++;
        }

        /*
        if (potentialConversion.length > 0) {
            let historyContext: Context | undefined = undefined;
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
            if (historyContexts.length > 0) {
                for (let hcontext of historyContexts) {
                    for (let h of downstreamHistories) {
                        if (hcontext.historiesEmitted.has(h)) {
                            let contexts = getContextsWithHistory(h, hcontext);
                            let deep = deepestContext(contexts);
                            if (deep) {
                                historyCandidates.add(deep);
                            }
                        }
                    }
                }
                if (historyCandidates.size > 0) {
                    console.log("history candidates=", historyCandidates);
                }
                historyContext = deepestContext(Array.from(historyCandidates));
                console.log("chosen history context=", historyContext);
            }
            console.log("deepest candidates id=%s", id, candidates, context, potentialConversion);
            for (let arg of args) {
                if (!indices.includes(j)) {
                    evaluatedArgs[j] = (pot).gen(arg);
                }
                j++;
            }
            contextToUse = historyContext || pot;
            //            console.log("POTENTIAL CONVERSION TRIGGERED = ", potentialConversion);
        } else if (historyContexts.length > 0) {
            console.log("HISTORY CONTEXTS!", historyContexts);
        }
        */

        //console.log('eval args id=%s contextToUse / potentialConversion/ historyContext', id, contextToUse, potentialConversion, historyContext, downstreamHistories);

        let result = {
            downstreamHistories,
            context: contextToUse,
            evaluatedArgs
        };
        //        console.log("eval args id=%s contextFound=", id, contextToUse.id);
        return result;
    };

    const emit = (context: Context, result: Generated): Generated => {
        //        console.log("emitting id=%s context.id=%s", id, context.id, getParentContexts(context).map(x => x.id).join("+"));
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
        //        console.log("memo id=%s context.id=%s", id, context.id, getParentContexts(context).map(x => x.id).join("+"));

        let historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context);
        let skipConversion = false;
        if (memoized && memoized.context) {
            if (context === memoized.context && lastHistoriesWritten !== undefined &&
                historiesBeingWrittenTo.size > lastHistoriesWritten) {
                //                console.log("case A id=%s", id);
                // we want to propagate this same memoized.context down, because
                // new histories have been emitted (i.e. written to)
                // really nothing to do in this case, we just proceed to remaining place
            } else if (context !== memoized.context) {
                if (historiesBeingWrittenTo.size > 0 && getHistoriesBeingWrittenTo(context).size > 0 && downstreamHistories.length > 0) {
                    // there are histories being written to "context", thus we need to copy them over
                    // to the memoized.context
                    //                    console.log("case B id=%s conversion memoized.context/context", id, memoized.context, context);

                    // this essentially means we are merging context into memoized.context
                    let ogContext = context;

                    context = memoized.context;
                    while (context.historiesEmitted.size == 0) {
                        context = (context as SIMDContext).context;
                    }

                    //                    console.log("case b conversion resulted in context/ogContext=", context, ogContext);
                    skipConversion = true;

                    historiesBeingWrittenTo.forEach(
                        h => context?.historiesEmitted.add(h));

                    // in order for the parent shit to work we need to make the og context have a parent to be the memoized.context

                    // skipSIMD = true;

                    if (ogContext === context) {
                    } else {
                        if (!getParentContexts(context).includes(ogContext)) {
                            //                            console.log('setting og context.context = context', ogContext, getParentContexts(ogContext).map(x => x.id).join("+"), context);
                            ogContext.context = context;
                        }
                    }

                    //                    console.log("copying over to memoized.context / context", memoized.context, context);

                    historiesBeingWrittenTo = getHistoriesBeingWrittenTo(context);
                } else {
                    // otherwise we return memoized
                    //                    console.log("case C id=%s", id);
                    return memoized;
                }
            } else if (context === memoized.context) {
                return memoized;
            }
        } else {
            //            console.log("no memo id=%s", id);
        }

        lastHistoriesWritten = historiesBeingWrittenTo.size;


        if (memoized && memoized.context) {
            getHistoriesBeingWrittenTo(memoized.context).forEach(
                h => historiesBeingWrittenTo.add(h));
            //historiesBeingWrittenTo.push(...getHistoriesBeingWrittenTo(memoized.context));
        }
        if (simdGen && !skipSIMD) {
            let simdContext: SIMDContext = _simdContext || context.useContext(true) as SIMDContext;
            _simdContext = simdContext;
            let result = evaluateArgs(simdContext, historiesBeingWrittenTo, skipConversion);
            //            console.log("SIMD case evalArgs id=%s", id, result, ogContext);
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
        //        console.log("evalArgs id=%s", id, result);

        downstreamHistories = result.downstreamHistories;

        if (result.context.isSIMD) {
            if (result.context.context) {
                result.context = result.context.context;
            } else {
                result.context = result.context.useContext(false);
            }
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
