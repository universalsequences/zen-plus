import { Arg, Generated, UGen } from "./zen";
import { uuid } from "./uuid";
import { simdMemo } from "./memo-simd";
import { Context, LoopContext } from "./context";
import { MemoryBlock } from "./block";
import { memo } from "./memo";

export const latch = (value: Arg, hold: Arg = 0): UGen => {
  let id = uuid();
  return simdMemo(
    (context: Context, _value: Generated, _hold: Generated): Generated => {
      let [latchVal] = context.useCachedVariables(id, "latchVal");
      let block: MemoryBlock = context.alloc(1);

      let code = `${context.varKeyword} ${latchVal} = memory[${block.idx}];
if (${_hold.variable} > 0) {
  memory[${block.idx}] = ${_value.variable};
  ${latchVal} = memory[${block.idx}];
}`;

      return context.emit(code, latchVal, _value, _hold);
    },
    undefined,
    value,
    hold,
  );
};
