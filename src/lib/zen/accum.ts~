import { UGen, Arg, genArg, Generated, } from './zen';
import { LoopContext, Context } from './context';
import { MemoryBlock } from './block';
import { memo } from './memo'

export interface AccumParams {
    min: number,
    max: number,
    init?: number,
    exclusive?: boolean // whether we should allow the accumulator to get to max

}
export const accum = (incr: Arg, reset: Arg = 0, params: AccumParams) => {
    let block: MemoryBlock;
    return memo((context: Context) => {
        block = context.alloc(1);
        let _incr = genArg(incr, context);
        let _reset = genArg(reset, context);
        let [varName] = context.useVariables("accum");

        if (params.init !== undefined) {
            block.initData = new Float32Array([params.init]);
        }
        let resetCheck = typeof reset === "number" && reset === 0 ?
            "" : `if (${_reset.variable} > 0) ${varName} = ${params.min};`

        let inclusiveCase = `${params.max - params.min} + ${_incr.variable}`;
        // exclusive by default
        let exclusive = params.exclusive === undefined || params.exclusive ? true : false;
        let comp = exclusive === true ? ">=" : ">";
        let code = `${context.varKeyword} ${varName} = memory[${block.idx}];
${resetCheck}
memory[${block.idx}] = ${varName} + ${_incr.variable};
if (memory[${block.idx}] ${comp} ${params.max}) memory[${block.idx}] -= ${!exclusive ? inclusiveCase : params.max - params.min};` + '\n';

        return context.emit(code, varName, _incr, _reset);
    });
};
