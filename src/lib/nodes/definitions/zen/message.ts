import { doc } from './doc';
import { Operator, Statement, CompoundOperator } from './types';
import { Lazy, ObjectNode, Message } from '../../types';

doc(
    'message',
    {
        numberOfInlets: 3,
        numberOfOutlets: 1,
        inletNames: ["value", "name", "subtype"],
        description: 'sends message out of worklet to main thread',

    });

export const message = (
    object: ObjectNode,
    name: Lazy,
    subType: Lazy
) => {
    return (value: Message) => {
        let op = {
            name: "message",
            params: name()
        };

        let x = [[op, subType(), value]] as Statement[];
        x[0].node = object;
        return x;
    };

};

