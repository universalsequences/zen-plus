import { Context, LoopContext } from "./context";
import { simdMemo } from "./memo-simd";
import { memo } from "./memo";
import { ContextualBlock } from "./history";
import { MemoryBlock } from "./block";
import { UGen, Generated } from "./zen";

export type Clicker = ((context: Context) => Generated) & {
  click?: (time?: number) => void;
  getIdx?: () => number;
};

export const click = (): Clicker => {
  let block: MemoryBlock;
  let _context: Context;
  let clickVar: string;
  let contextBlocks: ContextualBlock[] = [];

  let clicker: Clicker = simdMemo((context: Context): Generated => {
    let contextChanged = context !== _context;
    _context = context;
    if (block === undefined || contextChanged) {
      block = context.alloc(1);
      clickVar = context.useVariables("clickVal")[0];
      contextBlocks = contextBlocks.filter((x) => !x.context.disposed);
      contextBlocks.push({ block, context });
    }

    // the memory gets set via messaging and once a 1 is received
    // immediately set it back to 0
    // aka: generate a 1 for exactly one SAMPLE!
    let code = `
${context.varKeyword} ${clickVar} = memory[${block.idx}];
if (${clickVar} > 0) {
   memory[${block.idx}] = 0;
}
`;
    return context.emit(code, clickVar);
  });

  clicker.click = (time?: number, value?: number) => {
    for (let { context, block } of contextBlocks) {
      const loopSize = (block.context as LoopContext).loopSize || 0;
      if (loopSize) {
        for (let i = 0; i < loopSize; i++) {
          const idx = (block._idx as number) + i;
          let msg: any = {
            type: time !== undefined ? "schedule-set" : "memory-set",
            body: {
              idx: idx,
              value: value === undefined ? 1 : value,
              time,
            },
          };
          context.baseContext.postMessage(msg);
        }
      } else {
        let msg: any = {
          type: time !== undefined ? "schedule-set" : "memory-set",
          body: {
            idx: block.idx,
            value: value === undefined ? 1 : value,
            time,
          },
        };
        context.baseContext.postMessage(msg);
      }
    }
  };

  clicker.getIdx = () => {
    return block?.idx as number;
  };

  return clicker;
};
