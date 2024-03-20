import { doc } from './doc';
import { Statement, Operator, CompoundOperator } from './types';
import { peek, poke, data, BlockGen, Gettable, Interpolation } from '@/lib/zen/data';
import { Message, Lazy, ObjectNode } from "@/lib/nodes/types";
doc(
    'simdMatSum',
    {
        numberOfInlets: 2,
        inletNames: ["matrix", "weights"],
        numberOfOutlets: 1,
        description: "4 inputs based on matrix"
    }
);

export const zen_simdMatSum = (
    object: ObjectNode,
    weights: Lazy
) => {
    return (matrix: Message): Statement[] => {
        console.log('simd mat sum =', matrix, weights());
        let operator = { name: "simdMatSum" as Operator, block1: matrix, block2: weights() } as CompoundOperator;
        let op = [operator] as Statement;
        op.node = object;
        return [op];
    };
};

doc(
    'simdDotSum',
    {
        numberOfInlets: 2,
        inletNames: ["matrix", "inputs"],
        numberOfOutlets: 1,
        description: "4 inputs based on matrix"
    }
);

export const zen_simdDotSum = (
    object: ObjectNode,
    weights: Lazy
) => {
    return (matrix: Message): Statement[] => {
        console.log('simd mat sum =', matrix, weights());
        let operator = { name: "simdDotSum" as Operator, block1: matrix, block2: weights() } as CompoundOperator;
        let op = [operator] as Statement;
        op.node = object;
        return [op];
    };
};

doc(
    'simdDot',
    {
        numberOfInlets: 4,
        inletNames: ["buffer1", "buffer2", "offset1", "offset2"],
        numberOfOutlets: 1,
        description: "4 inputs based on matrix",
        defaultValue: 0
    }
);

export const zen_simdDot = (
    object: ObjectNode,
    buffer2: Lazy,
    offset1: Lazy,
    offset2: Lazy
) => {
    return (buffer1: Message): Statement[] => {
        let operator = { name: "simdDot" as Operator, block1: buffer1, block2: buffer2() } as CompoundOperator;
        console.log("zen simd dot patch");
        let op = [operator, offset1() as Statement, offset2() as Statement] as Statement;
        op.node = object;
        return [op];
    };
};





