import { UGen, Generated, Context } from './types';

/**
 * this ensures that functions that get called multiple times try to
 * only do the function's "work" once, and it's value gets re-used
 */
export const memo = (fn: UGen): UGen => {
    let memoized: Generated;
    let _context: Context;

    return (context: Context): Generated => {
        // the context === _context thing fucks up the physical modeling...
        if (memoized !== undefined) {
            // context is the same as previous call to this function
            if (_context === context) {
                // if its already emitted we just return the variable so we dont re-declare
                if (context.isVariableEmitted(memoized.variable!)) {
                    return {
                        ...memoized,
                        code: memoized.variable!
                    };

                }
                return memoized;
            } else {
                // context changed
                if (context.isVariableEmitted(memoized.variable!)) {
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
                    return memoized;
                }
            }
        }
        _context = context;
        memoized = fn(context);
        return memoized;
    };
};
