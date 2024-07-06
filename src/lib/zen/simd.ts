import { Arg, Context, UGen, Generated } from './index';
import { CodeFragment, printCodeFragments } from './emitter';
import { cKeywords } from './math';
import { Target } from './targets';
import { memo } from './memo';
import { BlockGen } from './data';

export const simdMatSum = (matrix: BlockGen, weights: BlockGen) => {
    return memo((context: Context) => {
        let size = 4;
        let weightsBlock = weights(context);
        let matrixBlock = matrix(context);
        let [result] = context.useVariables("matSum");

        let code = `
          float *${result} = matrix4x4Sum(${weightsBlock.idx}, ${matrixBlock.idx}, ${size});
          float ${result}_0 = ${result}[0];
          float ${result}_1 = ${result}[1];
          float ${result}_2 = ${result}[2];
          float ${result}_3 = ${result}[3];
`;

        return context.emit(code, result);
    });
};

export const simdDotSum = (matrix: BlockGen, vector: BlockGen) => {
    return memo((context: Context) => {
        let size = 4; //weights.getSize();
        // we want to pass the right index

        let weightsBlock = vector(context);
        let matrixBlock = matrix(context);
        let [result] = context.useVariables("matSum");

        let code = `
          float *${result} = matrix4x4DotSum(${weightsBlock.idx}, ${matrixBlock.idx}, ${size});
          float ${result}_0 = ${result}[0];
          float ${result}_1 = ${result}[1];
          float ${result}_2 = ${result}[2];
          float ${result}_3 = ${result}[3];
`;

        return context.emit(code, result);
    });
};

export const simdDot = (buffer1: BlockGen, buffer2: BlockGen, offset1: Arg, offset2: Arg) => {
    return memo((context: Context) => {
        console.log("SIMD DOT ");
        let size = 4; //weights.getSize();
        // we want to pass the right index

        let b1 = buffer1(context);
        let b2 = buffer2(context);

        let _offset1 = context.gen(offset1);
        let _offset2 = context.gen(offset2);
        let [result] = context.useVariables("matSum");

        let code = `
float ${result} = matrix4x4Dot(${b1.idx} + ${_offset1.variable} , ${b2.idx} + ${_offset2.variable});
`;

        return context.emit(code, result, _offset1, _offset2);
    });
};

type SIMDOperationMap = {
    [x: string]: string;
};


export const SIMD_OPERATIONS: SIMDOperationMap = {
    '+': 'wasm_f32x4_add',
    '*': 'wasm_f32x4_mul',
    '/': 'wasm_f32x4_div',
    '-': 'wasm_f32x4_sub',
    '<': 'wasm_f32x4_lt',
    '>': 'wasm_f32x4_gt',
    '>=': 'wasm_f32x4_ge',
    '<=': 'wasm_f32x4_le',
    '==': 'wasm_f32x4_eq',
    '!=': 'wasm_f32x4_ne',
    '||': 'wasm_v128_or',
    '&&': 'wasm_v128_and',
    '^': 'wasm_v128_xor',
    '%': 'wasm_f32x4_mod',
};

export const SIMD_FUNCTIONS: SIMDOperationMap = {
    "abs": "wasm_f32x4_abs",
    "floor": "wasm_f32x4_floor",
    "ceil": "wasm_f32x4_ceil",
    "sqrt": "wasm_f32x4_sqrt",
    "min": "wasm_f32x4_min",
    "max": "wasm_f32x4_max",
    "round": "wasm_f32x4_nearest",
    "trunc": "wasm_f32x4_trunc",
}


// an encapsulated SIMD Block of operations that can execute via SIMD 
export type SIMDBlock = {
    isSIMD: true
} & Generated;

export type CodeBlock = {
    isSIMD: boolean
} & Generated;


export const emitBlocks = (
    context: Context,  // the context
    isSIMD: boolean,  // true if this was called from a SIMD operator
    code: string,
    ...args: Generated[]): CodeBlock[] => {
    // at what point would we elevate the "code" passed here to become a block?
    let blocks: CodeBlock[] = [];

    for (let arg of args) {
        //blocks = Array.from(new Set([...blocks, ...arg.codeBlocks]));
    }

    // merge any blocks from same context

    return merge(blocks);

    /*
    let _blocks: CodeBlock[] = [];
    for (let block of blocks) {
        let match = _blocks.find(x => x.context === block.context);
        if (match) {
            console.log('merging', match, block);
            if (!match.code.includes(block.code)) {
            }
        } else {
            _blocks.push(block);
        }
    }

    console.log("emit blocks returned=", blocks);
    return _blocks;
*/
}


const merge = (blocks: CodeBlock[]): CodeBlock[] => {
    return blocks;
    /*
    let merged: CodeBlock[] = [];

    for (let block of blocks) {
        let match = merged.find(x => x.context === block.context);
        if (match) {
            console.log('should merge = ', block!.context!.id, match, block);
            block.code += match.code;

            if (match.codeFragments && block.codeFragments) {

                let mainFrag_A = match.codeFragments[match.codeFragments.length - 1]
                let mainFrag_B = block.codeFragments[block.codeFragments.length - 1]

                let dependencies = [];
                if (mainFrag_A) {
                    for (let i = 0; i < match.codeFragments.length - 1; i++) {
                        //dependencies.push(match.codeFragments[i]);
                    }
                    dependencies.push(...mainFrag_A.dependencies);
                }
                if (mainFrag_B) {
                    for (let i = 0; i < block.codeFragments.length - 1; i++) {
                        //dependencies.push(block.codeFragments[i]);
                    }
                    dependencies.push(...mainFrag_B.dependencies);
                }

                console.log("DEPENDENCIES WE ARRIVED AT=", dependencies);
                if (mainFrag_B) {
                    mainFrag_B.dependencies = dependencies;
                    console.log("MAIN FRAG B", mainFrag_B);
                } else if (mainFrag_A) {
                    mainFrag_A.dependencies = dependencies;
                    block.codeFragments = [mainFrag_A];
                    console.log("MAIN FRAG A", mainFrag_A);
                }
            }
            //block.codeFragments = [...block.codeFragments!, ...match.codeFragments!];
            block.histories = Array.from(new Set([...block.histories, ...match.histories]));
            setFragmentContexts(block.context!, block.codeFragments!);
            console.log("MERGE =", block);
            console.log("***** PRINTING CODE FRAGEMTN FOR MERGE");
            if (block.codeFragments) {
                console.log(printCodeFragments(block.context!, block.codeFragments));
            }

            console.log("***** END PRINT");

            if (!block.codeFragments) {
                console.log("NO CODE FRAGMENTS!", block);
            }


        } else {
            merged.push(block);
        }
    }

    return merged;
    */
};

const setFragmentContexts = (context: Context, frags: CodeFragment[]) => {
    for (let frag of frags) {
        if (frag.context.isSIMD === context.isSIMD) {
            frag.context = context;
        }
        setFragmentContexts(context, frag.dependencies);
    }
}
