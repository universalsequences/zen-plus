import { Context, Arg, UGen, Generated, GLType } from './types';
import { emitFunctions, argument, emitArguments } from './functions';
import { memo } from './memo';
import { ChildContextImpl } from './context';
import { emitType } from './context';

export const sumLoop = (body: Arg, iterations: Arg): UGen => {
    return memo((context: Context): Generated => {
        let loopContext = new ChildContextImpl(context);
        let _body = loopContext.gen(body);
        let _initialVal = loopContext.gen(0);
        context.idx = loopContext.idx + 100;

        let _iterations = context.gen(iterations);

        let accumulators = emitAccumulators(_body);

        console.log('function argums for loop=', accumulators);
        // need to be able to reference this variable w/in the loop
        //
        let [loopVar] = context.useVariables("loop_val");


        if (accumulators[0]) {
            // need a function argument...
            loopVar = accumulators[0].name
            _initialVal = accumulators[0].initial;
            console.log('choosing loopVar=', loopVar);
        }


        // okay so we have an argument so we need to use that 
        // determine the type based on the arguments to switch
        let _type = emitType([_body, _initialVal]);
        let type = context.printType(_type);
        let code = `
${_initialVal.type === GLType.Float ? "" : _initialVal.code}
${type} ${loopVar} = ${_initialVal.variable};
for (float i=0.0; i < ${_iterations.variable}; i++) {
${_body.code.split("\n").map(x => "    " + x).join("\n")}
${loopVar} += ${_body.variable};
}
`;
        console.log('code=', code);
        let generated: Generated = {
            ..._body,
            type: _body.type,
            variables: [],
            code,
            uniforms: _body.uniforms,
            variable: loopVar,
            functions: emitFunctions(_body), // maybe the body references even more functions
            functionArguments: emitArguments(_body)
        };

        return generated;
    });
};

// i think we need our own loop accumulator type
// that can be initialized seperate of arguments which gets confusing
// essentially these will be variables that can exist outside of the loop but
// are referenced inside the loop and "added" to

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


export interface LoopAccumulator {
    name: string;
    type: GLType;
    variable: string;
    initial: Generated;
}

export const loopAccumulator = (name: string, initialValue: Arg): UGen => {
    return memo((context: Context): Generated => {
        let _initial = context.gen(initialValue);
        let [_var] = context.useVariables("accum");
        name = name + _var;
        let out = `${context.printType(_initial.type)} ${_var} = ${name}; `;
        let generated: Generated = context.emit(_initial.type, out, _var, _initial);
        let args = [...(generated.loopAccumulators || []), { name, initial: _initial, type: _initial.type, variable: _var }];
        args = Array.from(new Set(args));
        generated.loopAccumulators = args;
        return generated;
    });
}

export const emitAccumulators = (...gen: Generated[]): LoopAccumulator[] => {
    let generated = new Set<LoopAccumulator>();
    for (let x of gen) {
        if (x.loopAccumulators) {
            for (let funcArg of x.loopAccumulators) {
                generated.add(funcArg);
            }
        }
    }
    return Array.from(generated);
};

