import type { LoopContext, Context, Arg, Generated } from "./index";
import { simdMemo } from "./memo-simd";
import { uuid } from "./uuid";
import { memo } from "./memo";
import { Target } from "./targets";

export const message = (name: string, subType: Arg, value: Arg) => {
  const id = uuid();
  return simdMemo(
    (context: Context, _value: Generated, _subType: Generated): Generated => {
      const [vari] = context.useCachedVariables(id, "message");
      // in a loop this will only catch one of the iterations (the last)
      // instead we need to have some sort of threshold
      // or store the messages somewhere
      let code = "";
      if (context.target === Target.C) {
        code += `
        if ((message_checker++) % 97 == 0) {
new_message(@beginMessage${name}@endMessage, ${_subType.variable}, ${_value.variable}, 0.0);
         }
`;
      } else {
        code += `
if (this.messageCounter % 32=== 0) {
this.port.postMessage({type: @beginMessage${name}@endMessage, subType: ${_subType.variable}, body: ${_value.variable}});
}
`;
      }
      code += `
${context.varKeyword} ${vari} = ${_value.variable};

`;

      return context.emit(code, vari, _subType, _value);
    },
    undefined,
    value,
    subType,
  );
};

/**
 * Sends a message if condition is met. no ratelimiting so ultra dangerous
 * The idea is that for proper sample-accurate sequencing we'd need to be able
 * to only send messages when a condition is met (like a "tick")
 *
 **/
export const condMessage = (name: string, subType: Arg, value: Arg, condition: Arg) => {
  return simdMemo(
    (
      context: Context,
      _value: Generated,
      _subType: Generated,
      _condition: Generated,
    ): Generated => {
      const [vari] = context.useVariables("message");
      // in a loop this will only catch one of the iterations (the last)
      // instead we need to have some sort of threshold
      // or store the messages somewhere
      let code = "";
      if (context.target === Target.C) {
        const timer =
          context.forceScalar || (context as LoopContext).loopSize
            ? "0.0"
            : "currentTime + j/44100.0";
        code += `
if (${_condition.variable}) {
new_message(@beginMessage${name}@endMessage, ${_subType.variable}, ${_value.variable}, ${timer});
}
`;
      } else {
        code += `
if (${_condition.variable}) {
this.port.postMessage({type: @beginMessage${name}@endMessage, subType: ${_subType.variable}, body: ${_value.variable}});
}
`;
      }
      code += `
${context.varKeyword} ${vari} = ${_value.variable};

`;

      return context.emit(code, vari, _value, _subType, _condition);
    },
    undefined,
    value,
    subType,
    condition,
  );
};
