import { Generated, UGen, Context, UniformDefinition } from './types';
import { ContextImpl } from './context';

export interface ZenGraph {
    code: string;
    context: Context;
}

export const zen = (input: UGen): ZenGraph => {
    let context: Context = new ContextImpl();
    let out: Generated = context.gen(input);

    let mainCode = out.code;
    mainCode += `
gl_FragColor = ${out.variable}; `;

    let uniforms = "";
    if (out.uniforms) {
        for (let uniform of out.uniforms) {
            uniforms += `
uniform ${context.printType(uniform.type)} ${uniform.name};
`
        }
    }
    let shaderCode = `
precision mediump float;
uniform vec2 resolution;
${uniforms}

void main() {
${mainCode.split("\n").map(x => "    " + x).join("\n")}
}
`;

    return {
        code: shaderCode,
        context,
    };
};
