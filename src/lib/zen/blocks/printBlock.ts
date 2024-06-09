import { CodeBlock } from './analyze'
import { replaceAll } from '../replaceAll';
import { Function } from '../functions';
import { LoopContext } from '../context';
import { determineBlocks } from './analyze'
import { countOutputs } from '../zen';

export const printBlock = (outputName: string, block: CodeBlock, totalInvocations?: number, isLast?: boolean, forceScalar?: boolean): string => {

    if (block.context.isFunctionCaller) {
        return `
${block.code}
`;
    }

    let post = `
${prettify("    ", block.code)}
${isLast ? "" : prettify("    ", printOutbound(block))}
`;

    // TODO: use a proper datastructure instead of this hellish list of strings-- some of which are
    // inputs/outputs
    let histories = Array.from(new Set(
        block.histories.filter(
            h =>
                post.includes(h.includes("double") || h.includes('float') ? h.split(" ")[1] : h) &&
                ((h.includes("float") || h.includes("double"))) &&
                !Array.from(block.fullInboundDependencies).some(y => {
                    return (h.split(" ").some(h1 => h1 === (y)));
                }))));

    let inbound = printInbound(block, histories, post);
    let code = "";
    if (!forceScalar) {
        code += `
for (int j=0; j < BLOCK_SIZE; j+= ${block.context.isSIMD ? 4 : 1}) {
`;
    }
    code += `
/* context#${block.context.id} */
${!block.context.isSIMD ? prettify("    ", histories.join("\n")) : ""}
${prettify("    ", inbound)}
${post}
`
    if (block.outputs.length > 0) {
        code += printOutputs(outputName, block, totalInvocations, forceScalar);
    }
    if (!forceScalar) {
        code += "}\n";
    }
    return code.split("\n").filter(x => x.trim().length > 0).join("\n");
}

export const printOutputs = (outputName: string, block: CodeBlock, totalInvocations?: number, forceScalar?: boolean): string => {
    let out = "";
    let numberOfOutputs = Math.max(...block.outputs) + 1;
    for (let output of block.outputs) {
        if (totalInvocations) {
            if (forceScalar) {
                out += `    ${outputName}[${output * 1} + ${numberOfOutputs} * invocation ] = output${output};
`;
            } else {
                out += `    ${outputName} [${output * 128} + ${numberOfOutputs} * invocation * 128 + j] = output${output};
                `;
            }
        } else {
            out += `    ${outputName} [${output * 128} + j] = output${output};
                `;
        }
    }
    return out;
}

export const printInbound = (block: CodeBlock, histories: string[], blockCode: string): string => {
    let code = "";
    let inbounds = block.inboundDependencies;
    if ((block.context as LoopContext).inboundDependencies) {
        (block.context as LoopContext).inboundDependencies!.forEach(
            d => inbounds.add(d));
    }
    for (let inboundVariable of Array.from(inbounds)) {
        // TODO: use a proper object to hold a history so we can figure out if if its here
        if (blockCode.includes("float " + inboundVariable + " =") ||
            blockCode.includes("double " + inboundVariable + " =")) {
            continue;
        }
        if (histories.some(x => x.split(" ")[1] === (inboundVariable))) {
            continue;
        }
        if (inboundVariable.includes("+")) {
            // this is a variable that is a function output and thus should be ignored
            continue;
        }
        if (block.context.isSIMD) {
            code += `v128_t ${inboundVariable} = wasm_v128_load(block_${inboundVariable} + j);
                `;
        } else if (blockCode.includes(inboundVariable)) {
            code += `float ${inboundVariable} = block_${inboundVariable} [j];
                `;
        }
    }
    return code;
}

export const printOutbound = (block: CodeBlock): string => {
    let code = "";
    for (let outboundVariable of Array.from(block.outboundDependencies)) {
        if (outboundVariable.includes("+")) {
            continue;
        }
        if (block.context.isSIMD) {
            code += `wasm_v128_store(block_${outboundVariable} + j, ${outboundVariable}); // Store the result
                `;
        } else {
            code += `block_${outboundVariable} [j] = ${outboundVariable};
                `;
        }
    }
    return code;
}

export const printCrossChainArrays = (blocks: CodeBlock[]): string => {
    let arrays = new Set<string>();
    for (let block of blocks) {
        block.outboundDependencies.forEach(
            dependency => arrays.add(dependency));
    }

    return Array.from(arrays).filter(variable => !variable.includes("+")).map(
        x => `float block_${x} [128] __attribute__((aligned(16)));; `).join('\n');
}

const mergeAdjacentBlocks = (blocks: CodeBlock[]): CodeBlock[] => {
    let _blocks: CodeBlock[] = [];
    let currentBlock: CodeBlock | null = null;
    for (let block of blocks) {
        if (!currentBlock) {
            if (block.context.isFunctionCaller || block.codeFragment.code === "") {
                _blocks.push(block);
            } else {
                currentBlock = block;
            }
        } else {
            if (currentBlock.context.isSIMD === block.context.isSIMD && !block.context.isFunctionCaller && block.codeFragment.code !== "") {
                // merge block into currentBlock
                let old = currentBlock;

                // TODO: only add inbound blocks that arent already outbound dependencies in currentBlock
                currentBlock = {
                    ... (currentBlock as CodeBlock),
                    code: currentBlock.code + '\n' + block.code,
                    outboundDependencies: new Set([...Array.from(currentBlock.outboundDependencies), ...Array.from(block.outboundDependencies)]),
                    inboundDependencies: new Set([...Array.from(currentBlock.inboundDependencies), ...Array.from(block.inboundDependencies)]),
                    fullInboundDependencies: new Set([...Array.from(currentBlock.fullInboundDependencies), ...Array.from(block.fullInboundDependencies)]),
                    histories: Array.from(new Set([...currentBlock.histories, ...block.histories])),
                    outputs: Array.from(new Set([...currentBlock.outputs, ...block.outputs])),

                };

                let inbound: string[] = [];
                for (let inb of Array.from(currentBlock.inboundDependencies)) {
                    if (!currentBlock?.outboundDependencies.has(inb)) {
                        inbound.push(inb);
                    }
                }
                let fullInbound: string[] = [];
                for (let inb of Array.from(currentBlock!.fullInboundDependencies)) {
                    if (!currentBlock?.outboundDependencies.has(inb)) {
                        fullInbound.push(inb);
                    }
                }
                currentBlock!.fullInboundDependencies = new Set(fullInbound);
                currentBlock!.inboundDependencies = new Set(inbound);
            } else {
                _blocks.push(currentBlock);
                if (block.context.isFunctionCaller || block.codeFragment.code === "") {
                    currentBlock = null;
                    _blocks.push(block);
                } else {
                    currentBlock = block;
                }
            }
        }
    }
    if (currentBlock) {
        _blocks.push(currentBlock);
    }
    return _blocks;
};

export const printBlocks = (blocks: CodeBlock[]): string => {
    let prefix = `EMSCRIPTEN_KEEPALIVE
void process(float * inputs, float * outputs, float currentTime)`;
    return printFunction(prefix, "outputs", blocks);
}

export const printUserFunction = (func: Function): string => {
    let name = func.name;
    let args = [...func.functionArguments].sort((a, b) => a.num - b.num);
    let argPrefix = func.context!.forceScalar ? "" : "*";
    let printedArgs = args.map(x => `float ${argPrefix}${x.name} `).join(",");
    let outputs = countOutputs(func.codeFragments);
    let totalSize = outputs * 128 * func.size;

    let outputArray = `float ${name}_out[${totalSize}]__attribute__((aligned(16))); `

    return `${outputArray}
${printFunction(`void ${name}(int invocation, ${printedArgs})`, `${func.name}_out`, determineBlocks(...func.codeFragments), 1, func.context!.forceScalar)}
                `;
}

export const printFunction = (functionSignature: string, outputName: string, blocks: CodeBlock[], totalInvocations?: number, forceScalar?: boolean): string => {

    blocks = mergeAdjacentBlocks(blocks);

    let code = printCrossChainArrays(blocks);

    code += `
${functionSignature} {
                    `;

    let post = "";
    let i = 0;
    for (let block of blocks) {
        let isLast = i === blocks.length - 1;
        post += "\n" + printBlock(outputName, block, totalInvocations, isLast, forceScalar).split("\n").map(x => x === "" ? x : "    " + x).join("\n");
        i++;
    }

    let constants = post.split("\n").filter(x => x.includes("v128_t constant")).join("\n");
    post = post.split("\n").filter(x => !x.includes("v128_t constant")).join("\n");

    post += "\n}\n";
    return replaceAll(code + dedupeConstants(constants) + post, "double", "float");
}

const dedupeConstants = (constants: string): string => {
    let c = constants.split("\n");
    let c1: string[] = [];

    let alreadyUsed: any = {};
    for (let a of c) {
        a = a.trim();
        let tokens = a.split("(");
        let variableName = a.split(" ")[1];
        if (!variableName) {
            c1.push(a);
            continue;
        }
        if (alreadyUsed[tokens[1]]) {
            c1.push("v128_t " + variableName + " " + alreadyUsed[tokens[1]] + ';');
        } else {
            c1.push(a);
            alreadyUsed[tokens[1]] = variableName.replace("=", "");
        }
    }
    return "\n" + prettify("    ", c1.join("\n"));
};

const prettify = (prefix: string, code: string): string => {
    return code.split("\n").filter(x => x.trim() !== "").map(
        x => x.trim() === "" ? "" : prefix + x.trim()
    ).join("\n");
}
