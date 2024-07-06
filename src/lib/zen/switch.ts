import { UGen, Arg, genArg, Generated, float } from './zen';
import { add, mult, wrap } from './math';
import { Context, SIMDContext } from './context';
import { simdMemo } from './memo';
import { uuid } from './uuid';

export const zswitch = (cond: Arg, thenExpr: Arg, elseExpr: Arg): UGen => {
    let id = uuid();
    return simdMemo((context: Context, _cond: Generated, _then: Generated, _else: Generated): Generated => {
        let [varName] = context.useCachedVariables(id, "switch");
        let out = `${context.varKeyword} ${varName} = ${_cond.variable} ? ${_then.variable} : ${_else.variable};`;
        return context.emit(out, varName, _cond, _then, _else);
    }, (context: SIMDContext, _cond: Generated, _then: Generated, _else: Generated) => {
        let [maskedA, invCondition, maskedB, result] = context.useCachedVariables(id, "maskedA", "invCondition", "maskedB", "result");

        let evaluatedArgs = [_cond, _then, _else];
        // otherwise we attempt to do this as SIMD
        let inVariables = evaluatedArgs.map(x => x.variable) as string[];
        // otherwise, we're in SIMD land
        let i = 0;
        let code = "";
        for (let input of evaluatedArgs) {
            if (input.scalar !== undefined) {
                // we need to create a constant SIMD vector (via splatting)
                let [v] = context.useCachedVariables(id, "constantVector_" + i);
                code += `v128_t ${v}= wasm_f32x4_splat(${input.scalar});
`;
                inVariables[i] = v;
            } else if (input.codeFragments[0].context.isSIMD) {
                if (input.codeFragments[0].context !== context) {
                    // the dependency exists in a previous block so we simply need to note that
                    // we need this dependency (i.e. pass the needed variable to context.emitSIMD)
                    let variable = input.variable as string;
                    inVariables[i] = variable;
                } else {
                    inVariables[i] = input.variable as string;
                }
            } else if (!input.codeFragments[0].context.isSIMD) {

            }
            i++;
        }

        code += `
v128_t ${result} = float_blend(${inVariables[0]}, ${inVariables[1]}, ${inVariables[2]});
`;


        let generated: Generated = context.emitSIMD(code, result, ...evaluatedArgs);
        return {
            generated,
            type: "SUCCESS"
        };
    }, cond, thenExpr, elseExpr);
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

