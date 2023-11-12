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

