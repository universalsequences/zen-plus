import { UGen, Generated } from './zen';
import { LoopContext, Context } from './context';

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
            } else if ((_context as LoopContext).context && //) {
                context.isVariableEmitted(memoized.variable!)) {
                let x = {
                    ...memoized,
                    code: memoized.variable!
                };
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
        memoized = fn(context);
        return memoized;
    };
};
