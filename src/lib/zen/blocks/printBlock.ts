import type { CodeBlock } from "./analyze";
import { replaceAll } from "../replaceAll";
import type { Function } from "../functions";
import type { LoopContext } from "../context";
import { determineBlocks } from "./analyze";
import { countOutputs } from "../zen";
import { Target } from "../targets";

export const printBlock = (
  outputName: string,
  block: CodeBlock,
  totalInvocations?: number,
  isLast?: boolean,
  forceScalar?: boolean,
  target?: Target,
): string => {
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
  const histories =
    target === Target.Javascript
      ? Array.from(new Set(block.histories.filter((h) => h.includes("let"))))
      : Array.from(
          new Set(
            block.histories.filter(
              (h) =>
                post.includes(
                  h.includes("double") || h.includes("float")
                    ? h.split(" ")[1]
                    : h,
                ) &&
                (h.includes("float") || h.includes("double")) &&
                !Array.from(block.fullInboundDependencies).some((y) => {
                  return h.split(" ").some((h1) => h1 === y);
                }),
            ),
          ),
        );

  const inbound = printInbound(block, histories, post);
  let code = "";
  const varKeyword = target === Target.C ? "int" : "let";
  if (!forceScalar) {
    code += `
for (${varKeyword} j=0; j < BLOCK_SIZE; j+= ${block.context.isSIMD ? 4 : 1}) {
`;
  }
  code += `
${!block.context.isSIMD ? prettify("    ", histories.join("\n")) : ""}
${prettify("    ", inbound)}
${post}
`;
  if (block.outputs.length > 0) {
    code += printOutputs(
      outputName,
      block,
      totalInvocations,
      forceScalar,
      target,
    );
  }
  if (!forceScalar) {
    code += "}\n";
  }
  return code
    .split("\n")
    .filter((x) => x.trim().length > 0)
    .join("\n");
};

export const printOutputs = (
  outputName: string,
  block: CodeBlock,
  totalInvocations?: number,
  forceScalar?: boolean,
  target?: Target,
): string => {
  let out = "";
  const numberOfOutputs = Math.max(...block.outputs) + 1;
  for (const output of block.outputs) {
    if (totalInvocations) {
      if (target === Target.Javascript) {
        out += `    this.${outputName}[invocation][${output * 1}] = output${output};
`;
      } else if (forceScalar) {
        out += `    ${outputName}[${output * 1} + ${numberOfOutputs} * invocation ] = output${output};
`;
      } else {
        out += `    ${outputName} [${output * 128} + ${numberOfOutputs} * invocation * 128 + j] = output${output};
                `;
      }
    } else {
      if (target === Target.C) {
        out += `    ${outputName} [${output * 128} + j] = output${output};
                `;
      } else {
        out += `    ${outputName} [0][${output}][j] = output${output};
                  `;
      }
    }
  }
  return out;
};

export const printInbound = (
  block: CodeBlock,
  histories: string[],
  blockCode: string,
): string => {
  let code = "";
  let inbounds = block.inboundDependencies;
  if ((block.context as LoopContext).inboundDependencies) {
    (block.context as LoopContext).inboundDependencies!.forEach((d) =>
      inbounds.add(d),
    );
  }
  for (let inboundVariable of Array.from(inbounds)) {
    // TODO: use a proper object to hold a history so we can figure out if if its here
    if (
      blockCode.includes(`float ${inboundVariable}  =`) ||
      blockCode.includes(`double ${inboundVariable} =`)
    ) {
      continue;
    }
    if (histories.some((x) => x.split(" ")[1] === inboundVariable)) {
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
};

export const printOutbound = (block: CodeBlock): string => {
  let code = "";
  for (const outboundVariable of Array.from(block.outboundDependencies)) {
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
};

export const printCrossChainArrays = (blocks: CodeBlock[]): string => {
  const arrays = new Set<string>();
  for (const block of blocks) {
    block.outboundDependencies.forEach((dependency) => arrays.add(dependency));
  }

  return Array.from(arrays)
    .filter((variable) => !variable.includes("+"))
    .map((x) => `float block_${x} [128] __attribute__((aligned(16)));; `)
    .join("\n");
};

const mergeAdjacentBlocks = (blocks: CodeBlock[]): CodeBlock[] => {
  const _blocks: CodeBlock[] = [];
  let currentBlock: CodeBlock | null = null;
  for (const block of blocks) {
    if (!currentBlock) {
      if (block.context.isFunctionCaller || block.codeFragment.code === "") {
        _blocks.push(block);
      } else {
        currentBlock = block;
      }
    } else {
      if (
        currentBlock.context.isSIMD === block.context.isSIMD &&
        !block.context.isFunctionCaller &&
        block.codeFragment.code !== ""
      ) {
        // merge block into currentBlock
        const old = currentBlock;

        // TODO: only add inbound blocks that arent already outbound dependencies in currentBlock
        currentBlock = {
          ...(currentBlock as CodeBlock),
          code: currentBlock.code + "\n" + block.code,
          outboundDependencies: new Set([
            ...Array.from(currentBlock.outboundDependencies),
            ...Array.from(block.outboundDependencies),
          ]),
          inboundDependencies: new Set([
            ...Array.from(currentBlock.inboundDependencies),
            ...Array.from(block.inboundDependencies),
          ]),
          fullInboundDependencies: new Set([
            ...Array.from(currentBlock.fullInboundDependencies),
            ...Array.from(block.fullInboundDependencies),
          ]),
          histories: Array.from(
            new Set([...currentBlock.histories, ...block.histories]),
          ),
          outputs: Array.from(
            new Set([...currentBlock.outputs, ...block.outputs]),
          ),
        };

        const inbound: string[] = [];
        for (const inb of Array.from(currentBlock.inboundDependencies)) {
          if (!currentBlock?.outboundDependencies.has(inb)) {
            inbound.push(inb);
          }
        }
        const fullInbound: string[] = [];
        for (const inb of Array.from(currentBlock.fullInboundDependencies)) {
          if (!currentBlock?.outboundDependencies.has(inb)) {
            fullInbound.push(inb);
          }
        }

        currentBlock.fullInboundDependencies = new Set(fullInbound);
        currentBlock.inboundDependencies = new Set(inbound);
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

export const printBlocks = (blocks: CodeBlock[], target: Target): string => {
  const returnType = target === Target.C ? "void" : "";
  const args =
    target === Target.C
      ? "float * inputs, float * outputs, float currentTime"
      : "inputs, outputs";
  const prefix = `${target === Target.C ? "EMSCRIPTEN_KEEPALIVE" : ""}
${returnType} process(${args})`;
  return printFunction(prefix, "outputs", blocks, undefined, undefined, target);
};

export const printUserFunction = (func: Function, target: Target): string => {
  const name = func.name;
  const args = [...func.functionArguments].sort((a, b) => a.num - b.num);
  const argPrefix = func.context!.forceScalar ? "" : "*";
  const varKeyword = target === Target.C ? "float" : "";
  const printedArgs = args
    .map((x) => `${varKeyword} ${argPrefix}${x.name} `)
    .join(",");
  const outputs = countOutputs(func.codeFragments);
  const totalSize = outputs * 128 * func.size;

  const outputArray =
    target === Target.C
      ? `float ${name}_out[${totalSize}]__attribute__((aligned(16))); `
      : `${name}_out = new Array(${func.size}).fill(0).map(() => new Float32Array(${outputs}));`;

  const intKeyword = target === Target.C ? "int" : "";
  const returnType = target === Target.C ? "void" : "";
  return `${outputArray}
${printFunction(`${returnType} ${name}(${intKeyword} invocation, ${printedArgs})`, `${func.name}_out`, determineBlocks(...func.codeFragments), 1, func.context!.forceScalar, target)}
                `;
};

export const printFunction = (
  functionSignature: string,
  outputName: string,
  _blocks: CodeBlock[],
  totalInvocations?: number,
  forceScalar?: boolean,
  target?: Target,
): string => {
  const blocks = mergeAdjacentBlocks(_blocks);

  let code = target === Target.C ? printCrossChainArrays(blocks) : "";

  code += `
${functionSignature} {
                    `;

  let post = "";

  if (target === Target.Javascript) {
    code += `let memory = this.memory;
    let BLOCK_SIZE = 128;
    if (this.disposed || !this.ready) {
      return true;
    }
    this.scheduleEvents(218);
`;
  }

  let i = 0;
  for (const block of blocks) {
    const isLast = i === blocks.length - 1;
    post += `
${printBlock(outputName, block, totalInvocations, isLast, forceScalar, target)
  .split("\n")
  .map((x) => (x === "" ? x : `    ${x}`))
  .join("\n")}`;
    i++;
  }

  const constants = post
    .split("\n")
    .filter((x) => x.includes("v128_t constant"))
    .join("\n");
  post = post
    .split("\n")
    .filter((x) => !x.includes("v128_t constant"))
    .join("\n");

  if (target === Target.C) {
    post += "\nelapsed += 128;\n";
  } else {
    post += "\nthis.elapsed += 128;\n";
    post += "\nthis.messageCounter ++;\n";
    post += "return true;\n";
  }
  post += "\n}\n";
  return replaceAll(
    code + dedupeConstants(constants) + post,
    "double",
    "float",
  );
};

const dedupeConstants = (constants: string): string => {
  const c = constants.split("\n");
  const c1: string[] = [];

  const alreadyUsed: any = {};
  for (let a of c) {
    a = a.trim();
    let tokens = a.split("(");
    let variableName = a.split(" ")[1];
    if (!variableName) {
      c1.push(a);
      continue;
    }
    if (alreadyUsed[tokens[1]]) {
      c1.push("v128_t " + variableName + " " + alreadyUsed[tokens[1]] + ";");
    } else {
      c1.push(a);
      alreadyUsed[tokens[1]] = variableName.replace("=", "");
    }
  }
  return "\n" + prettify("    ", c1.join("\n"));
};

const prettify = (prefix: string, code: string): string => {
  return code
    .split("\n")
    .filter((x) => x.trim() !== "")
    .map((x) => (x.trim() === "" ? "" : prefix + x.trim()))
    .join("\n");
};
