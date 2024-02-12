import { doc } from './doc'
import { Message, ObjectNode, Lazy } from '../../types';
import { Operator, Statement } from './types';

doc(
    'loop',
    {
        inletNames: ["body", "variableName", "min", "max"],
        numberOfInlets: 4,
        numberOfOutlets: 1,
        description: "loop sum"
    });
export const loop = (object: ObjectNode, variableName: Lazy, min: Lazy, max: Lazy) => {

    return (body: Message) => {
        if (typeof body === "string") {
            return [];
        }
        let l = [[
            { name: "rawSumLoop", range: { min: (min() as number) || 0, max: (max() as number) || 4 }, variableName: variableName() },
            body,
        ]];
        (l[0] as Statement).node = object;
        return l as Statement[];
    };
};

doc(
    'loopVariable',
    {
        description: "defines the iterator variable to be used in the loop",
        inletNames: ["none", "trig"],
        numberOfInlets: 2,
        numberOfOutlets: 1
    });

export const loopVariable = (object: ObjectNode, name: Lazy) => {
    object.needsLoad = true;
    return (x: Message) => {
        if (name()) {
            return [[{ name: "variable", variableName: name() }]] as Statement[];
        }
        return [];
    };
};


