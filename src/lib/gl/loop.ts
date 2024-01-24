import { Context, Arg, UGen, Generated, GLType } from './types';
import { emitFunctions, argument, emitArguments } from './functions';
import { memo } from './memo';
import { ChildContextImpl } from './context';
import { emitType } from './context';

export const sumLoop = (body: Arg, iterations: Arg, initialVal: Arg): UGen => {
    return memo((context: Context): Generated => {
        let loopContext = new ChildContextImpl(context);
        let _body = loopContext.gen(body);

        let _iterations = context.gen(iterations);
        let _initialVal = context.gen(initialVal);


        let functionArguments = emitArguments(_body);

        let [loopVar] = context.useVariables("loop_val");

        if (functionArguments[0]) {
            // need a function argument...
            loopVar = functionArguments[0].name
        }

        // okay so we have an argument so we need to use that 


        // determine the type based on the arguments to switch
        let _type = emitType([_body, _initialVal]);
        let type = context.printType(_type);
        let code = `
${type} ${loopVar} = ${_initialVal.variable};
for (float i=0.0; i < ${_iterations.variable}; i++) {
${_body.code.split("\n").map(x => "    " + x).join("\n")}
${loopVar} += ${_body.variable};
}
`;
        let generated: Generated = {
            ..._body,
            type: _body.type,
            variables: [],
            code,
            uniforms: _body.uniforms,
            variable: loopVar,
            functions: emitFunctions(_body), // maybe the body references even more functions
            functionArguments
        };

        return generated;
    });
};


export const loopAccumulator = (type: GLType) => argument("t", 1, type);

export const breakIf = (condition: Arg, elseCondition: Arg): UGen => {
    return memo((context: Context): Generated => {
        let _condition = context.gen(condition);
        let _else = context.gen(elseCondition);

        let code = `
if (${_condition.variable}) break;
`

        return context.emit(
            _else.type,
            code,
            _else.variable as string,
            _condition,
            _else);
    })
};

