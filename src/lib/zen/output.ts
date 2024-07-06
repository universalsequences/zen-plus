
import { UGen, Generated, Context, Arg } from './index';

export const output = (
    input: Arg,
    outputNumber: number): UGen => {

    return (context: Context): Generated => {
        context = context.useContext(false, true);
        let _context = context.useContext(false, true);
        let _input = _context.gen(input);
        let outputName = `output${outputNumber}`;
        let code = `
${context.varKeyword} ${outputName} = ${_input.variable};
`;

        let generated: Generated = context.emit(code, outputName, _input);
        generated.codeFragments[0].output = outputNumber;
        generated.outputs = outputNumber as number;
        return generated;
    }
};
