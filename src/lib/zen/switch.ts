import { UGen, Arg, genArg, Generated, float } from './zen';
import { add, mult, wrap } from './math';
import { Context } from './context';
import { memo } from './memo';

export const zswitch = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    return memo((context: Context): Generated => {
        let _cond = context.gen(cond);
        let _then = context.gen(thenExpr);
        let _else = context.gen(elseExpr);
        let [varName] = context.useVariables("switch");
        let out = `${context.varKeyword} ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.variable};`;
        return context.emit(out, varName, _cond, _then, _else);
    });
};

export const zswitch_inline_then = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    return (context: Context): Generated => {
        let _cond = context.gen(cond);
        let _then = context.gen(thenExpr);
        let _else = context.gen(elseExpr);
        let [varName] = context.useVariables("switch");
        let out = `let ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.variable}`;

        return context.emit(out, varName, _cond, _else);
    };
};

export const zswitch_inline_else = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    return (context: Context): Generated => {
        let _cond = context.gen(cond);
        let _then = context.gen(thenExpr);
        let _else = context.gen(elseExpr);
        let [varName] = context.useVariables("switch");
        let out = `let ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.code}`;
        return context.emit(out, varName, _cond, _then,);
    };
};

