import { Generated, UGen, Context, UniformDefinition } from './types';
import { Varying } from './varying';


export const generateShader = (out: Generated, context: Context, outputTerm: string, varyingsToInclude: Varying[] = []): string => {
    let mainCode = out.code;
    mainCode += `
${outputTerm} = ${out.variable}; `;

    let uniforms = "";
    let uniformsUsed = new Set<string>();
    if (out.uniforms) {
        for (let uniform of out.uniforms) {
            if (uniformsUsed.has(uniform.name)) {
                continue;
            }
            uniforms += `
uniform ${context.printType(uniform.type)} ${uniform.name};
`
            uniformsUsed.add(uniform.name);
        }
    }

    let functions = "";
    if (out.functions) {
        for (let fn of out.functions) {
            functions += printFunction(context, fn);
        }
    }

    let varyings = "";
    for (let varying of [...context.varyings, ...varyingsToInclude]) {
        varyings += `varying ${context.printType(varying.type)} ${varying.name};
`;
    }

    let attributes = "";
    if (context.attributes) {
        for (let attr of context.attributes) {
            attributes += `attribute ${context.printType(attr.get!().type)} ${attr.get!().name};
`
        }
    }

    let varyingCopies = "";
    for (let varying of varyingsToInclude) {
        varyingCopies += `
    ${varying.code}
    ${varying.name} = ${varying.attributeName};
`;
    }
    let shaderCode = `
precision mediump float;
uniform vec2 resolution;
${uniforms}
${attributes}
${varyings}

${functions}

void main() {
${mainCode.split("\n").map(x => "    " + x).join("\n")}
${varyingCopies}
}
`;

    return shaderCode;
};

const printFunction = (context: Context, fn: Generated): string => {
    let code = `${context.printType(fn.type)} ${fn.variable}(`;
    if (fn.functionArguments) {
        code += fn.functionArguments.sort((a, b) => a.num - b.num).map(arg => `${context.printType(arg.type)} ${arg.name}`).join(",");
    }
    code += `) {
${fn.code}
}
`
    return code;
}

