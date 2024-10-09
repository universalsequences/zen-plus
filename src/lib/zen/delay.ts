import { data, peek, poke } from "./data";
import { simdMemo } from "./memo";
import { Target } from "./targets";
import type { UGen, Generated, Arg } from "./zen";
import type { Context } from "./context";
import { accum } from "./accum";
import { lerpPeek } from "./lerp";
import { uuid } from "./uuid";
import { MemoryBlock } from "./block";

const MAX_SIZE = 4 * 44100; // 4 sec max

export const delay = (input: Arg, delayTime: Arg): UGen => {
  const buf = data(MAX_SIZE + 1, 1);
  const id = uuid();
  const a = accum(1, 0, { min: 0, max: MAX_SIZE, exclusive: true });

  return simdMemo(
    (context: Context, _input: Generated, _delayTime: Generated): Generated => {
      let buffer: MemoryBlock = buf(context);
      //let _input = context.gen(input);
      //let _delayTime = context.gen(delayTime);
      let [delayName, indexName, delayIndexName] = context.useCachedVariables(
        id,
        "delayVal",
        "index",
        "delayIndex",
      );

      let _accum = a(context);
      let index = `${buffer.idx} + (${_accum.variable})`;
      let lerped = lerpPeek(id, context, buffer, delayIndexName);
      //${_accum.code}
      let out = `
${context.target === Target.C ? "int" : "let"} ${indexName} = ${index};
memory[${indexName}] = ${_input.variable};
${context.target === Target.C ? "double" : "let"} ${delayIndexName} = ${indexName} - ${_delayTime.variable};
if (${delayIndexName} < ${buffer.idx}) {
  ${delayIndexName} += ${MAX_SIZE};
} else if (${delayIndexName} >= ${buffer.idx} + ${buffer.length} - 1) {
  ${delayIndexName} -= ${MAX_SIZE};
}
${lerped.code}
${context.varKeyword} ${delayName} = ${lerped.variable};
`;

      return context.emit(out, delayName, _input, _delayTime, _accum);
    },
    undefined,
    input,
    delayTime,
  );
};
