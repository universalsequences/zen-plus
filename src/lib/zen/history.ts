import { MemoryBlock } from './block';
import { LoopContext } from './context';
import { UGen, Generated, Arg, float } from './zen';
import { memo } from './memo';
import { Context, emitCode, ContextMessageType } from './context';
import { emitFunctions, emitArguments } from './functions';

export type Samples = number;
interface HistoryParams {
    inline: boolean,
    name?: string,
}

/** Use:
    declare a history at start:
    let history1 = history();
    
    now use it (ex: lowpass filter):
    history1(mix(synth(), history1(), .999))
 */

// an extremely weird type: a function that happens to
// also have a field that allows for setting the value
// of the heap referenced in the history in run time
export type History = ((input?: UGen, reset?: UGen) => UGen) & {
    value?: (v: number, time?: number) => void,
    paramName?: string,
}

export type ContextualBlock = {
    block: MemoryBlock;
    context: Context;
};

export const history = (val?: number, params?: HistoryParams, debugName?: string): History => {
    let block: MemoryBlock;
    let historyVar: string;
    let context: Context;
    let cachedValue: number;

    let contextBlocks: ContextualBlock[] = [];

    let _history: History = (input?: Arg, reset?: Arg): UGen => {
        return (_context: Context): Generated => {
            let ogContext = _context;
            let contextToUse = _context;
            if (params && params.name) {
                // need the base context if its a parameter (we dont want
                // a different parameter for every single loop iteration)
                while ("context" in contextToUse) {
                    contextToUse = contextToUse["context"] as Context;
                }
            }

            _context = contextToUse;
            let _input = typeof input === "number" ? float(input)(contextToUse) : input ? input(contextToUse) : undefined;
            let _reset = reset === undefined ? contextToUse.gen(float(0)) : contextToUse.gen(reset);


            let contextChanged = context !== _context;

            context = _context;
            if (block === undefined || contextChanged) {
                block = context.alloc(1);
                historyVar = context.useVariables(debugName || "historyVal")[0];
                contextBlocks = contextBlocks.filter(
                    x => !x.context.disposed);
                contextBlocks.push({ context, block });
            } else {
            }

            if (block._idx === 44794) {
                console.log("BLOCK IDX context=", context, block);
            }
            let IDX = block.idx;
            let historyDef = `${context.varKeyword} ${historyVar} = memory[${IDX}]` + '\n';

            let code = '';
            let _variable: string = historyVar;
            if (_input) {

                /*
                if (${_reset.variable} > 0) {
                  memory[${IDX}] = 0;
                }
                */
                let [newVariable] = context.useVariables("histVal");
                code = `
// history insert
memory[${IDX}] = ${_input.variable};
`;
                if (!params || !params.inline) {
                    code += `${context.varKeyword} ${newVariable} = ${historyVar};
`

                }
                if (params && params.inline) {
                    newVariable = code;
                    code = '';
                }
                _variable = newVariable;
                code = "/* begin history emit */ " + code + " /* end history emit */";
                let newCode = emitCode(context, code, _variable, _input, _reset);
                code = newCode;
            }

            let histories = _input ? emitHistory(_input, _reset) : [];
            let outerHistories = _input ? emitOuterHistory(_input, _reset) : [];
            let functions = _input ? emitFunctions(_input, _reset) : [];
            let args = _input ? emitArguments(_input, _reset) : [];

            if (val !== undefined) {
                block.initData = new Float32Array([val]);
            }
            if (cachedValue !== undefined) {
                block.initData = new Float32Array([cachedValue]);
            }
            let _params = _input ? emitParams(_input) : [];
            if (params && params.name) {
                _params = [_history, ..._params];
            }


            if (!historyDef.includes("*")) {
                outerHistories = [historyDef, ...outerHistories];
            }
            /*
            console.log("INPUT of history!=", _input);
            if (_input && (context as LoopContext).context) {
                code = _input.code + code;
            }
            */
            let out: Generated = {
                code,
                variable: _variable,
                histories: [historyDef, ...histories],
                outerHistories,
                params: _params,
                functions,
                variables: [_variable],
                functionArguments: args
            };

            //console.log("outputting history=", out);

            return out;
        }
    };



    if (params) {
        _history.paramName = params.name!;
    }

    /** 
        allows to set history directly, via message passing 
        when time is given, we schedule that
     */

    _history.value = (val: number, time?: Samples) => {
        if (context === undefined) {
            return;
        }

        for (let { context, block } of contextBlocks) {
            let messageType: ContextMessageType = time !== undefined ?
                "schedule-set" : "memory-set";
            let body = {
                idx: block.idx,
                value: val,
                time
            }

            context.postMessage({
                type: messageType,
                body
            });
        }

        cachedValue = val;
    };

    return _history;
}

/** used to collect all the histories for a functions arguments */
export const emitHistory = (...gen: Generated[]): string[] => {
    return Array.from(new Set(gen.flatMap(x => x.histories)));
};

/** used to collect all the histories for a functions arguments */
export const emitOuterHistory = (...gen: Generated[]): string[] => {
    return Array.from(new Set(gen.flatMap(x => x.outerHistories || [])));
};

/** used to collect all the histories for a functions arguments */
export const emitParams = (...gen: Generated[]): History[] => {
    return Array.from(new Set(gen.flatMap(x => x.params)));
};

