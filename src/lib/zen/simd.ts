import type { Arg, Context, UGen, Generated, SIMDContext } from "./index";
import { type CodeFragment, printCodeFragments } from "./emitter";
import { cKeywords } from "./math";
import type { Target } from "./targets";
import { memo, simdMemo } from "./memo";
import type { BlockGen } from "./data";

const OLD_SIMD = `
 float matrix4x4SumResult[4];
    float* matrix4x4Sum(int inputIdx, int matrixIdx, int size) {
       v128_t sum = wasm_f32x4_splat(0.0f); // initialize an SIMD vector with zeros
       int i=0;
       for (i=0; i < 4; i++) {
          v128_t weights = wasm_f32x4_splat(memory[inputIdx+i]); 
          int idx = matrixIdx + i * size;
          v128_t row = wasm_v128_load(&memory[idx]);
          v128_t prod = wasm_f32x4_mul(row, weights);
          sum = wasm_f32x4_add(sum, prod);
       }
       wasm_v128_store(matrix4x4SumResult, sum); 
       return matrix4x4SumResult;
    }
`;

// Ideal matrix mixer
// load inputs into a simd register
// for each row in the matrix, load the row into another simd register
// multiple the input simd register by the row simd register
// sum all the results into a scalar and store in index of output array
// return the result
//
// How can we deal with this output being a SIMD result? we could write it to an output buffer.
//
// How can we do this in fully simd instrinsics w/o needing a bespoke function

export const f32x4_splat = (in1: Arg, in2: Arg, in3: Arg, in4: Arg) => {
  const kernel = (context: Context) => {
    const [result] = context.useVariables("splat");
    const _in1 = context.gen(in1);
    const _in2 = context.gen(in2);
    const _in3 = context.gen(in3);
    const _in4 = context.gen(in4);
    const code = `v128_t ${result} = wasm_f32x4_splat(${_in1.variable}, ${_in2.variable}, ${_in3.variable}, ${_in4.variable});`;
    return context.emit(code, result, _in1, _in2, _in3, _in4);
  };
  return simdMemo(kernel, (context: SIMDContext) => {
    return {
      type: "SUCCESS",
      value: kernel(context),
    };
  });
};

// a1 b1 c1 d2
// a2 b2 c2 d2
// a3 b3 c3 d4
// a4 b4 c4 d4
//
// in1 in2 in3 in4
// (in1*a1 + in2*a2 + in3*a3 + in4*a4) (in1*b1 + in2*b2 + in3*b3 + in4*b4) ...
export const simdMatSum = (matrix: BlockGen, inputs: BlockGen, outputs: BlockGen) => {
  return simdMemo((context: Context) => {
    const size = 4;
    const inputsBlock = inputs(context);
    const matrixBlock = matrix(context);
    const outputsBlock = outputs(context);
    const [result] = context.useVariables("matSum");

    const code = `
    // Load all 4 inputs at once
    v128_t ${result}= wasm_v128_load(&memory[${inputsBlock.idx}]);

    // Process each output channel
    for (int i = 0; i < 4; i++) {
        // Load one row of the matrix
        v128_t matrix_row = wasm_v128_load(&memory[${matrixBlock.idx} + i * 4]);

        // Multiply inputs with matrix row
        v128_t product = wasm_f32x4_mul(${result}, matrix_row);

        // Horizontal sum of the product
        v128_t sum = wasm_f32x4_add(product, wasm_i32x4_shuffle(product, product, 2, 3, 0, 1));
        sum = wasm_f32x4_add(sum, wasm_i32x4_shuffle(sum, sum, 1, 0, 3, 2));

        // Store the result in the output
        memory[${outputsBlock.idx} + i] = wasm_f32x4_extract_lane(sum, 0);
    }
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
  "+": "wasm_f32x4_add",
  "*": "wasm_f32x4_mul",
  "/": "wasm_f32x4_div",
  "-": "wasm_f32x4_sub",
  "<": "wasm_f32x4_lt",
  ">": "wasm_f32x4_gt",
  ">=": "wasm_f32x4_ge",
  "<=": "wasm_f32x4_le",
  "==": "wasm_f32x4_eq",
  "!=": "wasm_f32x4_ne",
  "||": "wasm_v128_or",
  "&&": "wasm_v128_and",
  "^": "wasm_v128_xor",
  "%": "wasm_f32x4_mod",
};

export const SIMD_FUNCTIONS: SIMDOperationMap = {
  abs: "wasm_f32x4_abs",
  floor: "wasm_f32x4_floor",
  ceil: "wasm_f32x4_ceil",
  sqrt: "wasm_f32x4_sqrt",
  min: "wasm_f32x4_min",
  max: "wasm_f32x4_max",
  round: "wasm_f32x4_nearest",
  trunc: "wasm_f32x4_trunc",
};

// an encapsulated SIMD Block of operations that can execute via SIMD
export type SIMDBlock = {
  isSIMD: true;
} & Generated;

export type CodeBlock = {
  isSIMD: boolean;
} & Generated;

export const emitBlocks = (
  context: Context, // the context
  isSIMD: boolean, // true if this was called from a SIMD operator
  code: string,
  ...args: Generated[]
): CodeBlock[] => {
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
};

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
};
