import { UGen, Generated } from './zen';
import { LoopContext, Context } from './context';
import { float } from '.';

/**
 * this ensures that functions that get called multiple times try to
 * only do the function's "work" once, and it's value gets re-used
 */
export const memo = (fn: UGen): UGen => {
    let memoized: Generated | undefined;
    let _context: Context | undefined;

    return (context: Context): Generated => {
        if (context.idx >= 77777777) {
            console.log('clearing memo');
            let mockGen = { code: "mock", variable: "mock" };
            memoized = undefined;
            _context = undefined;
            return float(0)(context);
        }

        // the context === _context thing fucks up the physical modeling...
        if (memoized !== undefined) {
            // context is the same as previous call to this function
            if (_context === context) {
                // if its already emitted we just return the variable so we dont re-declare
                if (context.isVariableEmitted(memoized.variable!)) {
                    // HUGE TODO: if this variable hasnt appeared in this block (and is actually in another block)
                    // we need to fetch it via the arrays from the other block

                    // two possible solutions:
                    // 1. block specific contexts with variables & how to fetch them
                    // 2. some sort of list of available arrays (to fetch)
                    // 
                    // for now, have an ultra gheto way of "predicting whether we needed to do this"
                    // if context was originally a SIMD context but then turns into a different one
                    // this wont work once its memoized again
                    // it needs to have block-level context awareness.
                   

                    console.log("A. RETURNING MEMOIZED VARIABLE!!!", memoized.variable, context.isSIMD, context._isSIMD);
                    if (context._isSIMD && !context.isSIMD) {
                        return {
                            ...memoized,
                            code: `float ${memoized.variable} = block_${memoized.variable!}[j]; // FUCK
`
                        };
                    } else {
                        return {
                            ...memoized,
                            code: memoized.variable!
                        };
                    }

                }
                return memoized;
            } else if ((_context as LoopContext).context &&
                context.isVariableEmitted(memoized.variable!)) {
                let x = {
                    ...memoized,
                    code: memoized.variable!
                };
                if (_context!._isSIMD) {
                    x.code = "";
                }
                console.log("B. MEMOIZED", memoized.variable)
                _context = context;
                let skipEntirely = false;
                if (memoized.variables) {
                    for (let variable of memoized.variables) {
                        if (context.isVariableEmitted(variable)) {
                            // already emitted so we need to not send back memoized
                            skipEntirely = true;
                            break;
                        }
                    }
                    if (!skipEntirely) {
                        for (let variable of memoized.variables) {
                            context.emittedVariables[variable] = true;
                        }
                    }
                }
                if (!skipEntirely) {
                    return memoized;
                } else {
                    return x;
                }
            } else if (!memoized.variable!.includes("click")) {
                // context changed
                // in the case that a variable is used inside a loop first then memoized
                // existed

                if (context.isVariableEmitted(memoized.variable!)) {
                    console.log("C. RETURNING MEMOIZED VARIABLE!!!", memoized.variable);
                    return {
                        ...memoized,
                        code: memoized.variable!
                    };
                }

                let skipEntirely = false;
                if (memoized.variables) {
                    for (let variable of memoized.variables) {
                        if (context.isVariableEmitted(variable)) {
                            skipEntirely = true;
                            break;
                        }
                    }
                }
                if (!skipEntirely) {
                    if (memoized.variables) {
                        for (let variable of memoized.variables) {
                            context.emittedVariables[variable] = true;
                        }
                    }
                    context.emittedVariables[memoized.variable!] = true;
                    // _context = context;
                    return memoized;
                }
            }
        }
        _context = context;
        let a = new Date().getTime();
        console.log("calling memoized with context", context)
        memoized = fn(context);
        let b = new Date().getTime();
        if (b - a > 50) {
            console.log('memo internal fn took', b - a, memoized);
        }
        return memoized;
    };
};
