import { Context, LoopContext } from "./context";
import { simdMemo } from "./memo-simd";
import { ContextualBlock } from "./history";
import { MemoryBlock } from "./block";
import type { Generated } from "./zen";
import { uuid } from "./uuid";

type SetMessage = {
  type: "schedule-set" | "memory-set";
  body: {
    idx: number;
    value: number;
    time?: number;
    uuid: number;
  };
};

type CancelScheduleMessage = {
  type: "cancel-schedule-set";
  body: {
    uuid: number;
  };
};

export type Clicker = ((context: Context) => Generated) & {
  click?: (time?: number, value?: number, index?: number) => number;
  cancel?: (id: number) => void;
  getIdx?: () => number;
};

export const click = (): Clicker => {
  let block: MemoryBlock;
  let _context: Context;
  let clickVar: string;
  let contextBlocks: ContextualBlock[] = [];

  const clicker: Clicker = simdMemo((context: Context): Generated => {
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
  // returns an identifier for this set
  clicker.click = (time?: number, value?: number, index?: number) => {
    const actualValue = value ?? 1;

    const id = uuid();
    for (const { context, block } of contextBlocks) {
      const loopSize = (block.context as LoopContext).loopSize || 0;
      const messageType = time !== undefined ? "schedule-set" : "memory-set";

      if (index !== undefined) {
        sendSingleMessage(
          context,
          (block._idx as number) + index,
          messageType,
          actualValue,
          id,
          time,
        );
      } else if (loopSize) {
        sendLoopContextMessage(context, block, messageType, loopSize, actualValue, id, time, index);
      } else {
        sendSingleMessage(context, block.idx as number, messageType, actualValue, id, time);
      }
    }
    return id;
  };

  clicker.cancel = (id: number) => {
    for (const { context } of contextBlocks) {
      const msg: CancelScheduleMessage = {
        type: "cancel-schedule-set",
        body: {
          uuid: id,
        },
      };
      context.baseContext.postMessage(msg);
    }
  };

  // Add method to retrieve memory index
  clicker.getIdx = () => block?.idx as number;

  return clicker;
};

// Helper functions to improve readability

function sendSingleMessage(
  context: Context,
  idx: number,
  type: SetMessage["type"],
  value: number,
  uuid: number,
  time?: number,
) {
  const msg: SetMessage = {
    type,
    body: {
      idx,
      value,
      time,
      uuid,
    },
  };

  context.baseContext.postMessage(msg);
}

function sendLoopContextMessage(
  context: Context,
  block: MemoryBlock,
  type: SetMessage["type"],
  loopSize: number,
  value: number,
  uuid: number,
  time?: number,
  index?: number,
): void {
  for (let i = 0; i < loopSize; i++) {
    if (index !== undefined && i !== index) continue;

    const idx = (block._idx as number) + i;
    sendSingleMessage(context, idx, type, value, uuid, time);
  }
}
