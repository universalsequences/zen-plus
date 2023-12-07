import { ObjectNode, Message, Lazy } from '../../types';
import { API } from '@/lib/nodes/context';
import { doc } from './doc';

doc(
    '+',
    {
        numberOfOutlets: 1,
        numberOfInlets: 2,
        description: "adds two messages together"
    });

export const add = (node: ObjectNode, a: Lazy) => {
    return (message: Message): Message[] => {
        return [(message as number) + (a() as number)];
    };
}

doc(
    '*',
    {
        numberOfOutlets: 1,
        numberOfInlets: 2,
        description: "multiplies two messages together"
    });

export const mult = (node: ObjectNode, a: Lazy) => {
    return (message: Message): Message[] => {
        return [(message as number) * (a() as number)];
    };
}

doc(
    '/',
    {
        numberOfOutlets: 1,
        numberOfInlets: 2,
        description: "divides two messages together"
    });

export const div = (node: ObjectNode, a: Lazy) => {
    return (message: Message): Message[] => {
        return [(message as number) / (a() as number)];
    };
}



doc(
    'floor',
    {
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "applies a floor to number message"
    });

export const floor = (node: ObjectNode) => {
    return (message: Message): Message[] => {
        return [Math.floor(message as number)];
    };
}

doc(
    'sqrt',
    {
        numberOfOutlets: 1,
        numberOfInlets: 1,
        description: "applies square-root to a number message"
    });

export const sqrt = (node: ObjectNode) => {
    return (message: Message): Message[] => {
        return [Math.sqrt(message as number)];
    };
}



export const math: API = {
    '+': add,
    '*': mult,
    '/': div,
    sqrt,
    floor
};
