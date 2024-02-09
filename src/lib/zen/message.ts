import { Context, Arg, Generated, UGen } from './index';
import { memo } from './memo';
import { Target } from './targets';

/**
 * Its not e
 */
export const message = (name: string, subType: Arg, value: Arg) => {
    return memo((context: Context): Generated => {
        let _value = context.gen(value);
        let _subType = context.gen(subType);
        let [vari] = context.useVariables('message');
        // in a loop this will only catch one of the iterations (the last)
        // instead we need to have some sort of threshold
        // or store the messages somewhere
        let code = ``;
        if (context.target === Target.C) {
            code += `
new_message(@beginMessage${name}@endMessage, ${_subType.variable}, ${_value.variable});
`
        } else {
            code += `
if (this.messageCounter % 512 === 0) {
this.port.postMessage({type: @beginMessage${name}@endMessage, subType: ${_subType.variable}, body: ${_value.variable}});
/*
    let subTypeMap = this.messageQueue[@beginMessage${name}@endMessage];
    if (!subTypeMap) {
console.log("creating new array");
      subTypeMap = new Float32Array(8);
      this.messageQueue[@beginMessage${name}@endMessage] = subTypeMap;
    }

    // Add the message to the queue for the given type/subType
    subTypeMap[${_subType.variable}]= ${_value.variable};
*/
}
`;
        }
        code += `
${context.varKeyword} ${vari} = ${_value.variable};

`;

        return context.emit(code, vari, _subType, _value);
    });
};

/**
 * Sends a message if condition is met. no ratelimiting so ultra dangerous
 * The idea is that for proper sample-accurate sequencing we'd need to be able
 * to only send messages when a condition is met (like a "tick")
 *
  **/
export const condMessage = (name: string, subType: Arg, value: Arg, condition: Arg) => {
    return memo((context: Context): Generated => {
        let _value = context.gen(value);
        let _subType = context.gen(subType);
        let _condition = context.gen(condition);
        let [vari] = context.useVariables('message');
        // in a loop this will only catch one of the iterations (the last)
        // instead we need to have some sort of threshold
        // or store the messages somewhere
        let code = ``;
        if (context.target === Target.C) {
            code += `
if (${_condition.variable}) {
new_message(@beginMessage${name}@endMessage, ${_subType.variable}, ${_value.variable});
}
`
        } else {
            code += `
if (${_condition.variable}) {
this.port.postMessage({type: @beginMessage${name}@endMessage, subType: ${_subType.variable}, body: ${_value.variable}});
/*
    let subTypeMap = this.messageQueue[@beginMessage${name}@endMessage];
    if (!subTypeMap) {
console.log("creating new array");
      subTypeMap = new Float32Array(8);
      this.messageQueue[@beginMessage${name}@endMessage] = subTypeMap;
    }

    // Add the message to the queue for the given type/subType
    subTypeMap[${_subType.variable}]= ${_value.variable};
*/
}
`;
        }
        code += `
${context.varKeyword} ${vari} = ${_value.variable};

`;

        return context.emit(code, vari, _subType, _value);
    });
};

