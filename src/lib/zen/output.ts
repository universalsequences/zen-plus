
import { UGen, Generated, Context, Arg } from './index';

export const output = (
    input: Arg,
    outputNumber: number): UGen => {

    return (context: Context): Generated => {
        let _input = context.gen(input);

        let outputName = `output${outputNumber}`;
        let code = `
${outputName} = ${_input.variable};
`;

        let generated: Generated = context.emit(code, outputName, _input);
        generated.outputs = outputNumber as number;
        return generated;
    }
};
