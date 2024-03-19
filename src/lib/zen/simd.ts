import { Arg, Context, UGen, Generated } from './index';
import { cKeywords } from './math';
import { Target } from './targets';
import { memo } from './memo';
import { BlockGen } from './data';

export const simdMatSum = (matrix: BlockGen, weights: BlockGen) => {
    return memo((context: Context) => {
        let size = 4; //weights.getSize!();
        // we want to pass the right index

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



