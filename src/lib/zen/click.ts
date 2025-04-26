import { Context, LoopContext } from "./context";
import { simdMemo } from "./memo-simd";
import { ContextualBlock } from "./history";
import { MemoryBlock } from "./block";
import type { Generated } from "./zen";

type Message = {
  type: "schedule-set" | "memory-set";
  body: {
    idx: number;
    value: number;
    time?: number;
  };
};

export type Clicker = ((context: Context) => Generated) & {
  click?: (time?: number, value?: number, index?: number) => void;
  getIdx?: () => number;
};

export const click = (): Clicker => {
  let block: MemoryBlock;
  let _context: Context;
  let clickVar: string;
  let contextBlocks: ContextualBlock[] = [];

  const clicker = simdMemo((context: Context): Generated => {
    const contextChanged = context !== _context;
    _context = context;

    if (block === undefined || contextChanged) {
      block = context.alloc(1);
      clickVar = context.useVariables("clickVal")[0];

      // Clean up disposed contexts and add current one
      contextBlocks = contextBlocks.filter((x) => !x.context.disposed);
      contextBlocks.push({ block, context });
    }

    // Generate pulse: set memory back to 0 immediately after reading a positive value
    const code = `
${context.varKeyword} ${clickVar} = memory[${block.idx}];
if (${clickVar} > 0) {
  memory[${block.idx}] = 0;
}`;

    return context.emit(code, clickVar);
  });

  // Add click method to trigger the clicker
  clicker.click = (time?: number, value?: number, index?: number) => {
    const actualValue = value ?? 1;

    for (const { context, block } of contextBlocks) {
      const loopSize = (block.context as LoopContext).loopSize || 0;
      const messageType = time !== undefined ? "schedule-set" : "memory-set";

      if (loopSize) {
        sendLoopContextMessage(context, block, messageType, loopSize, actualValue, time, index);
      } else {
        sendSingleMessage(context, block.idx, messageType, actualValue, time);
      }
    }
  };

  // Add method to retrieve memory index
  clicker.getIdx = () => block?.idx;

  return clicker;
};

// Helper functions to improve readability

function sendSingleMessage(
  context: Context,
  idx: number,
  type: Message["type"],
  value: number,
  time?: number,
): void {
  const msg: Message = {
    type,
    body: {
      idx,
      value,
      time,
    },
  };

  context.baseContext.postMessage(msg);
}

function sendLoopContextMessage(
  context: Context,
  block: MemoryBlock,
  type: Message["type"],
  loopSize: number,
  value: number,
  time?: number,
  index?: number,
): void {
  for (let i = 0; i < loopSize; i++) {
    if (index !== undefined && i !== index) continue;

    const idx = (block._idx as number) + i;
    sendSingleMessage(context, idx, type, value, time);
  }
}
