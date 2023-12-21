import { ObjectNode, Message, Lazy } from '../../types';
import { doc } from './doc';

doc(
    'unpack',
    {
        numberOfOutlets: (x) => x - 1,
        numberOfInlets: 1,
        description: "unpacks list into outlets"
    });

export const unpack = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message): Message[] => {
        if (Array.isArray(message)) {
            return message as Message[];
        }
        return [];
    };
}

doc(
    'pak',
    {
        numberOfInlets: (x) => x - 1,
        numberOfOutlets: 1,
        description: "packs inlets into a list"
    });

export const pak = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message): Message[] => {
        let list: Message[] = [message];
        for (let a of args) {
            list.push(a() as Message);
        }
        return [list] as Message[];
    };
}

doc(
    'list.length',
    {
        numberOfInlets: 1,
        numberOfOutlets: 1,
        description: "returns length of list"
    });

export const list_length = (node: ObjectNode, ...args: Lazy[]) => {
    return (message: Message): Message[] => {
        return [(message as any[]).length] as Message[];
    };
}



export const lists = {
    "list.length": list_length,
    unpack,
    pak
};
