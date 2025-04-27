import { MemoryBlock } from "./block";
import type { Context, ContextMessage } from "./context";
import type { ContextualBlock } from "./history";
import { simdMemo } from "./memo-simd";
import { ParamGen } from "./param";

export const mcparam = (initialValue = 0) => {
  let contextBlocks: ContextualBlock[] = [];
  let block: MemoryBlock;
  let cachedContext: Context;
  let varName: string;

  const param: ParamGen = simdMemo((context: Context) => {
    const contextChanged = context !== cachedContext;
    cachedContext = context;
    if (block === undefined || contextChanged) {
      block = context.alloc(1);
      varName = context.useVariables("mcparamVal")[0];

      // Clean up disposed contexts and add current one
      contextBlocks = contextBlocks.filter((x) => !x.context.disposed);
      contextBlocks.push({ block, context });
    }

    const codeGen = `
${context.varKeyword} ${varName} = memory[${block.idx}];
`;
    return context.emit(codeGen, varName);
  });

  param.getInitData = () => initialValue;

  // sets parameter for a specific invocation
  param.set = (value: number, time?: number, invocation = 0) => {
    for (const { context, block } of contextBlocks) {
      const idx = (block._idx as number) + invocation;
      const messageBody: ContextMessage = {
        type: time && time >= 0 ? "schedule-set" : "memory-set",
        body: {
          idx,
          value,
          time,
        },
      };
      context.baseContext.postMessage(messageBody);
    }
  };

  return param;
};
